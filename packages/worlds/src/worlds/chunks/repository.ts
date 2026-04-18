import type { WorldsContext } from "#/types.ts";
import type {
  WorldsSearchInput,
  WorldsSearchOutput,
} from "#/worlds/search.schema.ts";
import type { WorldRow } from "#/management/schema.ts";
import { resolveSource, toWorldName } from "#/sources.ts";
import type { ChunkTableUpsert } from "./schema.ts";
import type { SearchIndex } from "#/types.ts";

/**
 * ChunksRepository handles the persistence of text chunks and their vector embeddings in-memory.
 * Each instance is scoped to a specific world coordinate (namespace/id).
 */
export class ChunksRepository {
  private static readonly worldChunks = new Map<
    string,
    Map<string, ChunkTableUpsert>
  >();

  private readonly worldKey: string;

  constructor(
    private readonly worldId: string,
    private readonly namespace?: string,
  ) {
    this.worldKey = `${namespace ?? "_"}/${worldId}`;
    if (!ChunksRepository.worldChunks.has(this.worldKey)) {
      ChunksRepository.worldChunks.set(this.worldKey, new Map());
    }
  }

  /**
   * upsert inserts or replaces a text chunk record.
   * @param chunk The chunk data to upsert.
   */
  public upsert(chunk: ChunkTableUpsert): void {
    ChunksRepository.worldChunks.get(this.worldKey)!.set(chunk.id, {
      ...chunk,
    });
  }

  /**
   * deleteByFactId removes all chunks associated with a specific fact.
   * @param factId The stable identifier of the fact.
   */
  public deleteByFactId(factId: string): void {
    const chunks = ChunksRepository.worldChunks.get(this.worldKey);
    if (!chunks) return;

    for (const [id, chunk] of chunks.entries()) {
      if (chunk.fact_id === factId) {
        chunks.delete(id);
      }
    }
  }

  /**
   * getForWorld returns all chunks for this world.
   */
  getForWorld(): ChunkTableUpsert[] {
    return Array.from(
      ChunksRepository.worldChunks.get(this.worldKey)?.values() ?? [],
    );
  }
}

/**
 * ChunksSearchRepository handles complex semantic and hybrid search operations across chunks.
 * Implements the SearchIndex interface for the simple & open shell architecture.
 */
export class ChunksSearchRepository implements SearchIndex {
  constructor(private readonly ctx: WorldsContext) {}

  /**
   * search performs a hybrid (vector + text) search for triples.
   * @param input The search parameters from the Worlds API.
   * @returns An array of search results with scores.
   */
  async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    const {
      query,
      subjects,
      predicates,
      types,
      namespace: inputNamespace,
      limit = 10,
    } = input;

    const namespace = inputNamespace ?? this.ctx.namespace;

    // Generate Embeddings
    const queryVector = query
      ? await this.ctx.vectors.embed(query)
      : new Array(this.ctx.vectors.dimensions).fill(0);

    // Resolve target worlds
    let targetWorlds: WorldRow[] = [];
    if (input.sources && input.sources.length > 0) {
      for (const source of input.sources) {
        const sourceName = typeof source === "string"
          ? source
          : (source as Record<string, unknown>).name as string ||
            (source as Record<string, unknown>).world as string ||
            (source as Record<string, unknown>).id as string;

        const resolved = resolveSource(sourceName, this.ctx);
        const row = await this.ctx.management.worlds.get(
          resolved.world,
          resolved.namespace,
        );
        if (row) targetWorlds.push(row);
      }
    } else {
      const result = await this.ctx.management.worlds.list({
        namespace,
        pageSize: 100,
      });
      targetWorlds = result.worlds;
    }

    const allResults: WorldsSearchOutput[] = [];

    for (const worldRow of targetWorlds) {
      const repo = new ChunksRepository(
        worldRow.id!,
        worldRow.namespace ?? undefined,
      );
      const chunks = repo.getForWorld();

      // Index subject types from the current world's chunks for filtering
      const subjectTypes = new Map<string, Set<string>>();
      for (const chunk of chunks) {
        if (
          chunk.predicate ===
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" ||
          chunk.predicate === "a"
        ) {
          if (!subjectTypes.has(chunk.subject)) {
            subjectTypes.set(chunk.subject, new Set());
          }
          subjectTypes.get(chunk.subject)!.add(chunk.text);
        }
      }

      const worldResults: WorldsSearchOutput[] = chunks
        .filter((c) => !subjects || subjects.includes(c.subject))
        .filter((c) => !predicates || predicates.includes(c.predicate))
        .filter((c) => {
          if (!types || types.length === 0) return true;
          const actualTypes = subjectTypes.get(c.subject);
          return types.some((t) => actualTypes?.has(t));
        })
        .map((c) => {
          let score = 0;
          let vecRank = null;

          if (c.vector) {
            const chunkVector = c.vector instanceof ArrayBuffer
              ? new Float32Array(c.vector)
              : new Float32Array(c.vector.buffer);

            // Simple dot product as similarity measure
            score = (queryVector as number[]).reduce(
              (acc, val, i) => acc + val * (chunkVector[i] || 0),
              0,
            );
            vecRank = score;
          }

          if (!query || score === 0) {
            if (!query || c.text.toLowerCase().includes(query.toLowerCase())) {
              score = Math.max(score, 0.5);
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
