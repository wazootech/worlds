import { z } from "zod";
import { type World, worldSchema } from "./schema.ts";
import { type WorldsSource, worldsSourceSchema } from "#/schemas/input.ts";
export { worldsSourceSchema };
export type { WorldsSource };


/**
 * SearchWorldResult represents a search result from the TripleSearch service.
 */
export const searchWorldResultSchema = z.object({
  subject: z.string().describe("The subject of the triple."),
  predicate: z.string().describe("The predicate of the triple."),
  object: z.string().describe("The object of the triple."),
  vecRank: z.number().nullable().describe("Vector search rank."),
  ftsRank: z.number().nullable().describe("Full-text search rank."),
  score: z.number().describe("Combined search score."),
  world: worldSchema,
});

export type SearchWorldResult = z.infer<typeof searchWorldResultSchema>;


/**
 * SearchWorldRequest represents the parameters for searching triples.
 */
export const searchWorldRequestSchema = z.object({
  sources: z.array(worldsSourceSchema).optional().describe(
    "The list of target worlds.",
  ),
  namespace: z.string().optional().describe(
    "The optional namespace of the target world.",
  ),
  query: z.string().describe("The search query string."),
  limit: z.number().int().positive().optional().describe(
    "Maximum number of results to return.",
  ),
  subjects: z.array(z.string()).optional().describe(
    "Optional list of subject URIs to filter by.",
  ),
  predicates: z.array(z.string()).optional().describe(
    "Optional list of predicate URIs to filter by.",
  ),
  types: z.array(z.string()).optional().describe(
    "Optional list of type URIs to filter by.",
  ),
});

export type SearchWorldRequest = z.infer<typeof searchWorldRequestSchema>;

