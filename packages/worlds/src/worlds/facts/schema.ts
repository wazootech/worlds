import { z } from "zod";

/**
 * FactTable represents a fact record (RDF quad) as stored in memory.
 * Graph column stores the named graph URI (default graph if null).
 */
export interface FactTable {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  graph: string;
}

/**
 * factTableSchema is the Zod schema for the fact record.
 */
const factTableShape = z.object({
  id: z.string(),
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  graph: z.string(),
});

export const factTableSchema: z.ZodType<FactTable> = factTableShape;

/**
 * FactRow represents a fact record without metadata/vector fields.
 */
export interface FactRow extends FactTable {}

/**
 * factRowSchema is the Zod schema for a fact record.
 */
export const factRowSchema: z.ZodType<FactRow> = factTableShape;

/**
 * FactTableUpsert represents the data needed to upsert a fact.
 */
export type FactTableUpsert = FactTable;

/**
 * factTableUpsertSchema is the Zod schema for inserting or replacing a fact.
 */
export const factTableUpsertSchema: z.ZodType<FactTableUpsert> =
  factTableSchema;
