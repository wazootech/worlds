import { z } from "../shared/z.ts";

/**
 * ChunkId is a branded string for Chunk identifiers.
 */
export const chunkIdSchema = z.id("Chunk");
export type ChunkId = z.infer<typeof chunkIdSchema>;

/**
 * ChunkTable represents a chunk record as stored in memory.
 */
export const chunkTableSchema = z.object({
  /**
   * id is the unique identifier for the chunk.
   */
  id: chunkIdSchema,

  /**
   * fact_id is the ID of the parent fact.
   */
  fact_id: z.string(),

  /**
   * subject is the subject of the parent fact.
   */
  subject: z.string(),

  /**
   * predicate is the predicate of the parent fact.
   */
  predicate: z.string(),

  /**
   * text is the text content of the chunk.
   */
  text: z.string(),

  /**
   * vector is the raw vector embedding data.
   */
  vector: z.union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array)])
    .nullable(),
});

export type ChunkTable = z.infer<typeof chunkTableSchema>;


/**
 * ChunkRow represents a chunk record without the vector field.
 */
export const chunkRowSchema = chunkTableSchema.omit({
  vector: true,
});

export type ChunkRow = z.infer<typeof chunkRowSchema>;


/**
 * ChunkTableUpsert represents the data needed to upsert a chunk.
 */
export const chunkTableUpsertSchema = chunkTableSchema;

export type ChunkTableUpsert = z.infer<typeof chunkTableUpsertSchema>;


/**
 * searchRowSchema is the Zod schema for SearchRow.
 */
export const searchRowSchema = z.object({
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  vecRank: z.number().nullable(),
  ftsRank: z.number().nullable(),
  combinedRank: z.number(),
});

export type SearchRow = z.infer<typeof searchRowSchema>;
