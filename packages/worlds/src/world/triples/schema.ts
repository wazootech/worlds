import { z } from "zod";

/**
 * TripleTable represents a triple record as stored in the database.
 * Graph column stores the named graph URI (default graph if null).
 * Recommended max: 100K triples for in-memory N3 Store loading.
 */
export interface TripleTable {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  graph: string;
}

/**
 * tripleTableSchema is the Zod schema for the triples database table.
 */
const tripleTableShape = z.object({
  id: z.string(),
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  graph: z.string(),
});

export const tripleTableSchema: z.ZodType<TripleTable> = tripleTableShape;

/**
 * TripleRow represents a triple record without the vector field.
 */
export interface TripleRow extends Omit<TripleTable, "vector"> {}

/**
 * tripleRowSchema is the Zod schema for a triple record as returned by search queries.
 */
export const tripleRowSchema: z.ZodType<TripleRow> = tripleTableShape;

/**
 * TripleTableUpsert represents the data needed to upsert a triple.
 */
export type TripleTableUpsert = TripleTable;

/**
 * tripleTableUpsertSchema is the Zod schema for inserting or replacing a triple.
 */
export const tripleTableUpsertSchema: z.ZodType<TripleTableUpsert> = tripleTableSchema;

