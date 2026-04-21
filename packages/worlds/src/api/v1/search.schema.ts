import { z } from "../../shared/z.ts";
import { worldSchema } from "../../resources/world.schema.ts";
import { type Source, sourceSchema } from "./source.schema.ts";

export { sourceSchema };
export type { Source };


/**
 * SearchWorldsResponse represents the results from a triple search.
 */
export const searchWorldsResponseSchema = z.object({
  /**
   * results is the list of search results.
   */
  results: z.array(z.object({
    subject: z.string().describe("The subject of the triple."),
    predicate: z.string().describe("The predicate of the triple."),
    object: z.string().describe("The object of the triple."),
    vecRank: z.number().nullable().describe("Vector search rank."),
    ftsRank: z.number().nullable().describe("Full-text search rank."),
    score: z.number().describe("Combined search score."),
    world: worldSchema,
  })).describe("The list of search results."),

  /**
   * nextPageToken is a token to retrieve the next page of results.
   */
  nextPageToken: z.string().optional().describe(
    "A token to retrieve the next page of results.",
  ),
});

export type SearchWorldsResponse = z.infer<typeof searchWorldsResponseSchema>;
export type SearchWorldsResult = SearchWorldsResponse["results"][number];



/**
 * SearchWorldsRequest represents the parameters for searching triples.
 */
export const searchWorldsRequestSchema = z.object({
  sources: z.array(sourceSchema).optional().describe(
    "The list of target worlds.",
  ),
  parent: z.string().optional().describe(
    "The parent resource name (e.g., 'namespaces/default').",
  ),
  query: z.string().describe("The search query string."),
  pageSize: z.number().int().positive().optional().describe(
    "Maximum number of results to return.",
  ),
  pageToken: z.string().optional().describe("A page token for pagination."),
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

export type SearchWorldsRequest = z.infer<typeof searchWorldsRequestSchema>;
