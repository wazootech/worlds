import type { components } from "../api/v1/types.generated.ts";

/**
 * ChunkId is an alias for a string.
 */
export type ChunkId = string;

/**
 * ChunkTable is the interface for a Chunk resource.
 * We override 'vector' because the OpenAPI spec uses 'string' (base64)
 * but the engine needs 'Uint8Array'.
 */
export type ChunkTable =
  & Omit<components["schemas"]["Chunk"], "vector">
  & {
    vector?: Uint8Array | null;
  };

/**
 * ChunkTableUpsert is the payload for upserting chunks.
 * Accepts both base64 strings (API) and Uint8Arrays (Engine).
 */
export type ChunkTableUpsert =
  & Omit<ChunkTable, "vector">
  & {
    vector?: string | Uint8Array | null;
  };
