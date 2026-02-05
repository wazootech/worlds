import type { Client } from "@libsql/client";
import type { AppContext } from "#/server/app-context.ts";
import { searchChunks, upsertChunks } from "./queries.sql.ts";
import type { TripleSearchResult } from "#/sdk/worlds/schema.ts";
import type { WorldRow } from "#/server/databases/core/worlds/schema.ts";
import type { WorldsService } from "#/server/databases/core/worlds/service.ts";
import type { ChunkTableUpsert } from "./schema.ts";

export class ChunkRepository {
  constructor(private readonly db: Client) {}

  async upsert(chunk: ChunkTableUpsert): Promise<void> {
    await this.db.execute({
      sql: upsertChunks,
      args: [
        chunk.id,
        chunk.triple_id,
        chunk.subject,
        chunk.predicate,
        chunk.text,
        chunk.vector ? new Uint8Array(chunk.vector) : null,
      ],
    });
  }
}

export interface SearchParams {
  query: string;
  worldIds?: string[];
  worlds?: WorldRow[];
  subjects?: string[];
  predicates?: string[];
  limit?: number;
  organizationId: string;
}

export class ChunksService {
  constructor(
    private readonly ctx: AppContext,
    private readonly worldsService: WorldsService,
  ) {}

  async search(params: SearchParams): Promise<TripleSearchResult[]> {
    const {
      query,
      worldIds,
      subjects,
      predicates,
      limit = 20,
      organizationId,
    } = params;

    // 1. Generate Embeddings
    const vector = await this.ctx.embeddings.embed(query);

    // 2. Procure world records if not provided
    let worlds = params.worlds;
    if (!worlds && worldIds) {
      const worldPromises = worldIds.map((id) =>
        this.worldsService.getById(id)
      );
      worlds = (await Promise.all(worldPromises)).filter(
        (w: WorldRow | null): w is WorldRow => w !== null,
      );
    }

    if (!this.ctx.databaseManager) {
      throw new Error("Search manager not available");
    }

    if (!worlds || worlds.length === 0) {
      return [];
    }

    // 4. Search across all target worlds in parallel
    const searchPromises = worlds.map(async (world) => {
      try {
        const managed = await this.ctx.databaseManager!.get(world.id);

        const subjectsParam = subjects && subjects.length > 0
          ? JSON.stringify(subjects)
          : null;
        const predicatesParam = predicates && predicates.length > 0
          ? JSON.stringify(predicates)
          : null;
        const args = [
          new Uint8Array(new Float32Array(vector).buffer),
          limit,
          query,
          limit,
          subjectsParam,
          subjectsParam,
          predicatesParam,
          predicatesParam,
          limit,
        ];

        const result = await managed.database.execute({
          sql: searchChunks,
          args,
        });

        interface SearchRow {
          subject: string;
          predicate: string;
          object: string;
          vec_rank: number | null;
          fts_rank: number | null;
          combined_rank: number;
        }
        const results: TripleSearchResult[] = (
          result.rows as unknown as SearchRow[]
        ).map((row) => ({
          subject: row.subject,
          predicate: row.predicate,
          object: row.object,
          vecRank: row.vec_rank,
          ftsRank: row.fts_rank,
          score: row.combined_rank,
        }));

        return results.map((r) => ({
          ...r,
          worldId: world.id,
          organizationId,
        }));
      } catch (error) {
        console.error(`Search error for world ${world.id}:`, error);
        return [];
      }
    });

    const allResults = (await Promise.all(searchPromises)).flat();

    // 4. Sort by combined rank and limit
    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
