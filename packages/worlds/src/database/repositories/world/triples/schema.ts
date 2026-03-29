import { z } from "zod";

/**
 * TripleTable represents a triple record as stored in the database.
 */
export interface TripleTable {
  /**
   * id is the unique identifier for the triple (typically a hash).
   */
  id: string;

  /**
   * subject is the subject of the triple.
   */
  subject: string;

  /**
   * predicate is the predicate of the triple.
   */
  predicate: string;

  /**
   * object is the object value of the triple.
   */
  object: string;

  /**
   * vector is the raw vector embedding data (optional at this level).
   */
  vector: ArrayBuffer | Uint8Array | null;
}

/**
 * tripleTableSchema is the Zod schema for the triples database table.
 * This represents the raw database row structure including the vector.
 */
const tripleTableShape = z.object({
  id: z.string(),
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  vector: z
    .union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array)])
    .nullable(),
});

export const tripleTableSchema: z.ZodType<TripleTable> = tripleTableShape;

/**
 * TripleRow represents a triple record without the vector field.
 */
export interface TripleRow extends Omit<TripleTable, "vector"> {}

/**
 * tripleRowSchema is the Zod schema for a triple record as returned by search queries.
 * This omits the large vector field for performance.
 */
export const tripleRowSchema: z.ZodType<TripleRow> = tripleTableShape.omit({
  vector: true,
});

/**
 * TripleTableUpsert represents the data needed to upsert a triple.
 */
export type TripleTableUpsert = TripleTable;

/**
 * tripleTableUpsertSchema is the Zod schema for inserting or replacing a triple.
 */
export const tripleTableUpsertSchema: z.ZodType<
  TripleTableUpsert
> = tripleTableSchema;
