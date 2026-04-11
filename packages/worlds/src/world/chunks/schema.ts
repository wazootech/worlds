import { z } from "zod";

/**
 * ChunkTable represents a chunk record as stored in the database.
 */
export interface ChunkTable {
  /**
   * id is the unique identifier for the chunk.
   */
  id: string;

  /**
   * triple_id is the ID of the parent triple.
   */
  triple_id: string;

  /**
   * subject is the subject of the parent triple.
   */
  subject: string;

  /**
   * predicate is the predicate of the parent triple.
   */
  predicate: string;

  /**
   * text is the text content of the chunk.
   */
  text: string;

  /**
   * vector is the raw vector embedding data.
   */
  vector: ArrayBuffer | Uint8Array | null;
}

const chunkTableShape = z.object({
  id: z.string(),
  triple_id: z.string(),
  subject: z.string(),
  predicate: z.string(),
  text: z.string(),
  vector: z.union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array)])
    .nullable(),
});

/**
 * chunkTableSchema is the Zod schema for ChunkTable.
 */
export const chunkTableSchema: z.ZodType<ChunkTable> = chunkTableShape;

/**
 * ChunkRow represents a chunk record without the vector field.
 */
export interface ChunkRow extends Omit<ChunkTable, "vector"> {}

/**
 * chunkRowSchema is the Zod schema for ChunkRow.
 */
export const chunkRowSchema: z.ZodType<ChunkRow> = chunkTableShape.omit({
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
 * SearchRow represents a single row from a hybrid search result.
 */
export interface SearchRow {
  /**
   * subject is the subject of the matching triple.
   */
  subject: string;

  /**
   * predicate is the predicate of the matching triple.
   */
  predicate: string;

  /**
   * object is the full object text of the matching triple.
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

