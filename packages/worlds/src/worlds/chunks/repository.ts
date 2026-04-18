import type { WorldsContext } from "#/types.ts";
import type { WorldsSearchOutput } from "#/worlds/search.schema.ts";
import type { WorldRow } from "#/system/worlds/schema.ts";
import { toWorldName } from "#/sources.ts";
import type { ChunkTableUpsert } from "./schema.ts";

/**
 * ChunksRepository handles the persistence of text chunks and their vector embeddings in-memory.
 * Each instance is scoped to a specific world.
 */
export class ChunksRepository {
  private static readonly worldChunks = new Map<
    string,
    Map<string, ChunkTableUpsert>
  >();

  constructor(private readonly worldId: string) {
    if (!ChunksRepository.worldChunks.has(worldId)) {
      ChunksRepository.worldChunks.set(worldId, new Map());
    }
  }

  /**
   * upsert inserts or replaces a text chunk record.
   * @param chunk The chunk data to upsert.
   */
  upsert(chunk: ChunkTableUpsert): Promise<void> {
    ChunksRepository.worldChunks.get(this.worldId)!.set(chunk.id, { ...chunk });
  }

  /**
   * getForWorld returns all chunks for this world.
   */
  getForWorld(): ChunkTableUpsert[] {
    return Array.from(
      ChunksRepository.worldChunks.get(this.worldId)?.values() ?? [],
    );
  }
}

/**
 * SearchParams represents the parameters for a semantic and text search.
 */
export interface SearchParams {
  query: string;
  worlds?: WorldRow[];
  subjects?: string[];
  predicates?: string[];
  types?: string[];
  namespace?: string;
  limit?: number;
}

/**
 * ChunksSearchRepository handles complex semantic and hybrid search operations across chunks.
 */
export class ChunksSearchRepository {
  constructor(private readonly ctx: WorldsContext) {}

  /**
   * search performs a hybrid (vector + text) search for triples.
   * @param params The search parameters.
   * @returns An array of search results with scores.
   */
  async search(params: SearchParams): Promise<WorldsSearchOutput[]> {
    const {
      query,
      worlds,
      subjects,
      predicates,
      namespace: inputNamespace,
      limit = 10,
    } = params;

    const namespace = inputNamespace ?? this.ctx.namespace;

    // Generate Embeddings
    const queryVector = query
      ? await this.ctx.vectors.embed(query)
      : new Array(this.ctx.vectors.dimensions).fill(0);

    // Resolve target worlds
    let targetWorlds: WorldRow[] = [];
    if (worlds && worlds.length > 0) {
      targetWorlds = worlds;
    } else {
      const result = await this.ctx.worlds.list({ namespace, pageSize: 100 });
      targetWorlds = result.worlds;
    }

    const allResults: WorldsSearchOutput[] = [];

    for (const worldRow of targetWorlds) {
      const repo = new ChunksRepository(worldRow.id!);
      const chunks = repo.getForWorld();

      const worldResults: WorldsSearchOutput[] = chunks
        .filter((c) => !subjects || subjects.includes(c.subject))
        .filter((c) => !predicates || predicates.includes(c.predicate))
        .map((c) => {
          let score = 0;
          let vecRank = null;

          if (c.vector) {
            const chunkVector = c.vector instanceof ArrayBuffer
              ? new Float32Array(c.vector)
              : new Float32Array(c.vector.buffer);

            // Simple dot product as similarity measure
            score = queryVector.reduce(
              (acc, val, i) => acc + val * (chunkVector[i] || 0),
              0,
            );
            vecRank = score;
          }

          // Simple text matching if query is present and no vector score
          if (query && score === 0) {
            if (c.text.toLowerCase().includes(query.toLowerCase())) {
              score = 0.5;
            }
          }

          return {
            subject: c.subject,
            predicate: c.predicate,
            object: c.text,
            vecRank,
            ftsRank: null,
            score,
            world: {
              name: toWorldName({
                namespace: worldRow.namespace ?? undefined,
                world: worldRow.id ?? undefined,
              }),
              id: worldRow.id,
              namespace: worldRow.namespace ?? undefined,
              label: worldRow.label ?? undefined,
              description: worldRow.description ?? undefined,
              createdAt: worldRow.created_at,
              updatedAt: worldRow.updated_at,
              deletedAt: worldRow.deleted_at ?? undefined,
            },
          } as WorldsSearchOutput;
        })
        .filter((r) => r.score > 0);

      allResults.push(...worldResults);
    }

    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
