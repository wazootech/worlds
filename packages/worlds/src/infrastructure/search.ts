import type { Patch } from "./rdf/patch/types.ts";
import type { SearchWorldsRequest, SearchWorldsResult } from "../schema.ts";

import type { Embeddings } from "../vectors/embeddings.ts";
import type { ManagementLayer } from "../management/worlds.ts";
import type { StoreEngine } from "./store.ts";
import type { WorldId } from "../resources/world.types.ts";
import type { ChunkId } from "../resources/chunk.types.ts";

/**
 * SearchEngine handles semantic search operations.
 * Optional - search() throws if not provided.
 */
export interface SearchEngine {
  /**
   * search executes a semantic search against the world.
   */
  search(input: SearchWorldsRequest): Promise<SearchWorldsResult[]>;

  /**
   * applyPatches handles patches when data changes (sync mechanism).
   */
  applyPatches?(patches: Patch[]): Promise<void>;

  /**
   * close cleans up resources.
   */
  close?(): Promise<void>;
}

export interface ChunksSearchEngineOptions {
  embeddings: Embeddings;
  management: ManagementLayer;
  namespace?: string;
  world?: string;
  storeEngine?: StoreEngine;
}

/**
 * ChunksSearchEngine handles semantic search using chunk-based vector indexing.
 * Implements the SearchEngine interface for the Worlds engine.
 */
export class ChunksSearchEngine implements SearchEngine {
  constructor(private readonly options: ChunksSearchEngineOptions) {}

  async search(input: SearchWorldsRequest): Promise<SearchWorldsResult[]> {
    const {
      query,
      subjects,
      predicates,
      types,
      parent,
      pageSize: limit = 10,
    } = input;

    const namespace = parent ?? this.options.namespace;

    const queryVector = query
      ? await this.options.embeddings.embed(query)
      : new Array(this.options.embeddings.dimensions).fill(0);

    const result = this.options.management.worlds.list({
      namespace,
      pageSize: 100,
    });

    const allResults: SearchWorldsResult[] = [];

    for (const worldRow of result.worlds) {
      const { ChunksRepository } = await import(
        "./chunks/repository.ts"
      );
      const repo = new ChunksRepository(
        worldRow.id!,
        worldRow.namespace ?? undefined,
      );
      const chunks = repo.getForWorld();

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

      const worldResults = chunks
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
            const chunkVector = c.vector instanceof Uint8Array
              ? new Float32Array(c.vector.buffer)
              : typeof c.vector === "string"
              ? new Float32Array(
                new Uint8Array(
                  // deno-lint-ignore no-explicit-any
                  (atob as any)(c.vector).split("").map((char: string) =>
                    char.charCodeAt(0)
                  ),
                ).buffer,
              )
              : new Float32Array(c.vector as unknown as ArrayBuffer);

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
            ftsRank: undefined,
            score,
            world: {
              name: worldRow.namespace
                ? `${worldRow.namespace}/${worldRow.id}`
                : worldRow.id,
              id: worldRow.id as WorldId,
              namespace: worldRow.namespace ?? undefined,
              displayName: worldRow.label ?? undefined,
              description: worldRow.description ?? undefined,
              createTime: worldRow.created_at,
              updateTime: worldRow.updated_at,
              deleteTime: worldRow.deleted_at ?? undefined,
            },
          } as SearchWorldsResult;
        })
        .filter((r) => r.score > 0);

      allResults.push(...worldResults);
    }

    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async applyPatches(patches: Patch[]): Promise<void> {
    for (const patch of patches) {
      const { ChunksRepository } = await import(
        "./chunks/repository.ts"
      );

      for (const deletion of patch.deletions ?? []) {
        const key = `${deletion.graph.value}/${deletion.subject.value}`;
        const parts = key.split("/");
        const ns = parts.length > 1 ? parts[0] : undefined;
        const id = parts.length > 1 ? parts.slice(1).join("/") : parts[0];
        const repo = new ChunksRepository(id, ns === "_" ? undefined : ns);
        repo.deleteByFactId(deletion.subject.value);
      }

      for (const insertion of patch.insertions ?? []) {
        const key = `${insertion.graph.value}/${insertion.subject.value}`;
        const parts = key.split("/");
        const ns = parts.length > 1 ? parts[0] : undefined;
        const id = parts.length > 1 ? parts.slice(1).join("/") : parts[0];
        const repo = new ChunksRepository(id, ns === "_" ? undefined : ns);

        const objectText = insertion.object.value;
        const vector = await this.options.embeddings.embed(objectText);

        repo.upsert({
          id: crypto.randomUUID() as ChunkId,

          fact_id: insertion.subject.value,
          subject: insertion.subject.value,
          predicate: insertion.predicate.value,
          text: objectText,
          vector: new Uint8Array(new Float32Array(vector).buffer),
        });
      }
    }
  }

  async close(): Promise<void> {
    // No-op for in-memory search engine
  }
}
