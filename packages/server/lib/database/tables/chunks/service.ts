import type { Client } from "@libsql/client";
import type { ServerContext } from "#/context.ts";
import { searchChunks, upsertChunks } from "./queries.sql.ts";
import type { TripleSearchResult } from "@wazoo/worlds-sdk";
import type { WorldRow } from "#/lib/database/tables/worlds/schema.ts";
import type { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import {
  type ChunkTableUpsert,
  type SearchRow,
  searchRowSchema,
} from "./schema.ts";

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
  worldId?: string;
  world?: WorldRow;
  subjects?: string[];
  predicates?: string[];
  limit?: number;
}

export class ChunksService {
  constructor(
    private readonly ctx: ServerContext,
    private readonly worldsService: WorldsService,
  ) {}

  async search(params: SearchParams): Promise<TripleSearchResult[]> {
    const {
      query,
      worldId,
      subjects,
      predicates,
      limit = 10,
    } = params;

    // 1. Generate Embeddings
    const vector = await this.ctx.embeddings.embed(query);

    // 2. Procure world record if not provided
    let world = params.world;
    if (!world && worldId) {
      world = await this.worldsService.getById(worldId) ?? undefined;
    }

    if (!this.ctx.libsql.manager) {
      throw new Error("Search manager not available");
    }

    if (!world) {
      return [];
    }

    // 4. Search across the target world
    try {
      const managed = await this.ctx.libsql.manager.get(world.id);

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

      const results: TripleSearchResult[] = (
        result.rows as unknown as SearchRow[]
      ).map((untrustedRow) => {
        const row = searchRowSchema.parse(untrustedRow);
        return {
          subject: row.subject,
          predicate: row.predicate,
          object: row.object,
          vecRank: row.vec_rank,
          ftsRank: row.fts_rank,
          score: row.combined_rank,
          worldId: world.id,
        };
      });

      // 4. Sort by combined rank and limit
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error(`Search error for world ${world.id}:`, error);
      return [];
    }
  }
}
