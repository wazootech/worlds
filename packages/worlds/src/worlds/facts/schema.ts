import { z } from "zod";

/**
 * FactTable represents a fact record (RDF quad) as stored in memory.
 */
export const factTableSchema = z.object({
  id: z.string(),
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  graph: z.string(),
});

export type FactTable = z.infer<typeof factTableSchema>;


/**
 * FactRow represents a fact record without metadata/vector fields.
 */
export const factRowSchema = factTableSchema;

export type FactRow = z.infer<typeof factRowSchema>;


/**
 * FactTableUpsert represents the data needed to upsert a fact.
 */
export const factTableUpsertSchema = factTableSchema;

export type FactTableUpsert = z.infer<typeof factTableUpsertSchema>;

