import { z } from "zod";

/**
 * WorldsSearchOutput represents a search result from the TripleSearch service.
 */
export interface WorldsSearchOutput {
  /**
   * subject is the subject of the triple.
   */
  subject: string;

  /**
   * predicate is the predicate of the triple.
   */
  predicate: string;

  /**
   * object is the object of the triple.
   */
  object: string;

  /**
   * vecRank is the rank of the result from vector search.
   */
  vecRank: number | null;

  /**
   * ftsRank is the rank of the result from full-text search.
   */
  ftsRank: number | null;

  /**
   * score is the combined search score.
   */
  score: number;

  /**
   * slug is the slug of the world the triple belongs to.
   */
  slug?: string;
}

/**
 * worldsSearchOutputSchema is the Zod schema for WorldsSearchOutput.
 */
export const worldsSearchOutputSchema: z.ZodType<WorldsSearchOutput> = z.object(
  {
    subject: z.string(),
    predicate: z.string(),
    object: z.string(),
    vecRank: z.number().nullable(),
    ftsRank: z.number().nullable(),
    score: z.number(),
    slug: z.string().optional(),
  },
);

/**
 * WorldsSearchInput represents the parameters for searching triples.
 */
export interface WorldsSearchInput {
  /**
   * slug is the slug of the target world.
   */
  slug: string;

  /**
   * query is the search query string.
   */
  query: string;

  /**
   * limit is the maximum number of results to return.
   */
  limit?: number;

  /**
   * subjects is an optional list of subject URIs to filter by.
   */
  subjects?: string[];

  /**
   * predicates is an optional list of predicate URIs to filter by.
   */
  predicates?: string[];

  /**
   * types is an optional list of type URIs to filter by.
   */
  types?: string[];
}

/**
 * worldsSearchInputSchema is the Zod schema for WorldsSearchInput.
 */
export const worldsSearchInputSchema: z.ZodType<WorldsSearchInput> = z.object({
  slug: z.string().describe("The slug of the target world."),
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
