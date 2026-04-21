import { z } from "../z.ts";

/**
 * FactId is a branded string for Fact identifiers.
 */
export const factIdSchema = z.id("Fact");
export type FactId = string;

/**
 * FactTable represents a fact record (RDF quad) as stored in memory.
 */
export const factTableSchema = z.object({
  id: factIdSchema,
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  graph: z.string(),
});

export interface FactTable {
  id: FactId;
  subject: string;
  predicate: string;
  object: string;
  graph: string;
}


/**
 * FactRow represents a fact record without metadata/vector fields.
 */
export const factRowSchema = factTableSchema;

export type FactRow = FactTable;


/**
 * FactTableUpsert represents the data needed to upsert a fact.
 */
export const factTableUpsertSchema = factTableSchema;

export type FactTableUpsert = FactTable;