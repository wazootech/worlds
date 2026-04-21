import { z } from "zod";

/**

 * ChunkTable represents a chunk record as stored in memory.
 */
export const chunkTableSchema = z.object({
  /**
   * id is the unique identifier for the chunk.
   */
  id: z.string(),

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
 * SearchRow represents a single row from a hybrid search result.
 */
export interface SearchRow {
  /**
   * subject is the subject of the matching fact.
   */
  subject: string;

  /**
   * predicate is the predicate of the matching fact.
   */
  predicate: string;

  /**
   * object is the full object text of the matching fact.
   */
  object: string;

  /**
   * vec_rank is the rank based on vector similarity.
   */
  vec_rank: number | null;

  /**
   * fts_rank is the rank based on full-text search relevance.
   */
  fts_rank: number | null;

  /**
   * combined_rank is the final score calculated by the search engine.
   */
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
