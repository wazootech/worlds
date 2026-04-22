import type { Chunk, ChunkId as ChunkIdGen } from "../api/v1/types.gen.ts";

export type ChunkId = ChunkIdGen;
export type ChunkTable =
  & Omit<Chunk, "vector">
  & {
    vector?: Uint8Array | null;
  };

export type ChunkTableUpsert =
  & Omit<ChunkTable, "vector">
  & {
    vector?: string | Uint8Array | null;
  };
