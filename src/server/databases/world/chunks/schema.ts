import { z } from "zod";

/**
 * chunkTableSchema is the Zod schema for the chunks database table.
 * This represents the raw database row structure including the vector.
 */
export const chunkTableSchema = z.object({
  id: z.string(),
  triple_id: z.string(),
  subject: z.string(),
  predicate: z.string(),
  text: z.string(),
  vector: z
    .union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array)])
    .nullable(),
});

/**
 * ChunkTable represents a chunk record as stored in the database.
 */
export type ChunkTable = z.infer<typeof chunkTableSchema>;

/**
 * chunkRowSchema is the Zod schema for a chunk record as returned by search queries.
 * This omits the large vector field for performance.
 */
export const chunkRowSchema = chunkTableSchema.omit({
  vector: true,
});

/**
 * ChunkRow represents a chunk record without the vector field.
 */
export type ChunkRow = z.infer<typeof chunkRowSchema>;

/**
 * chunkTableUpsertSchema is the Zod schema for inserting or replacing a chunk.
 */
export const chunkTableUpsertSchema = chunkTableSchema;

/**
 * ChunkTableUpsert represents the data needed to upsert a chunk.
 */
export type ChunkTableUpsert = z.infer<typeof chunkTableUpsertSchema>;
