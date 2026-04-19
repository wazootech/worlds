import type { ChunkTableUpsert } from "./schema.ts";

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
