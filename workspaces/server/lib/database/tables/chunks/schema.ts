import { z } from "zod";

/**
 * ChunkTable represents a chunk record as stored in the database.
 */
export interface ChunkTable {
  id: string;
  triple_id: string;
  subject: string;
  predicate: string;
  text: string;
  vector: ArrayBuffer | Uint8Array | null;
}

/**
 * chunkTableSchema is the Zod schema for ChunkTable.
 */
export const chunkTableSchema = z.object({
  id: z.string(),
  triple_id: z.string(),
  subject: z.string(),
  predicate: z.string(),
  text: z.string(),
  vector: z.union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array)])
    .nullable(),
});

/**
 * ChunkRow represents a chunk record without the vector field.
 */
export interface ChunkRow extends Omit<ChunkTable, "vector"> {}

/**
 * chunkRowSchema is the Zod schema for ChunkRow.
 */
export const chunkRowSchema: z.ZodType<ChunkRow> = chunkTableSchema.omit({
  vector: true,
});

/**
 * ChunkTableUpsert represents the data needed to upsert a chunk.
 */
export type ChunkTableUpsert = ChunkTable;

/**
 * chunkTableUpsertSchema is the Zod schema for inserting or replacing a chunk.
 */
export const chunkTableUpsertSchema: z.ZodType<ChunkTableUpsert> =
  chunkTableSchema;

/**
 * SearchRow represents a single row from a search result.
 */
export interface SearchRow {
  subject: string;
  predicate: string;
  object: string;
  vec_rank: number | null;
  fts_rank: number | null;
  combined_rank: number;
}

/**
 * searchRowSchema is the Zod schema for SearchRow.
 */
export const searchRowSchema: z.ZodType<SearchRow> = z.object({
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  vec_rank: z.number().nullable(),
  fts_rank: z.number().nullable(),
  combined_rank: z.number(),
});
