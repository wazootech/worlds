import { z } from "zod";

/**
 * TripleSearchResult represents a search result from the TripleSearch service.
 */
export interface TripleSearchResult {
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
   * worldId is the ID of the world the triple belongs to.
   */
  worldId?: string;
}

/**
 * Triple represents a basic RDF triple used within the SDK.
 */
export interface Triple {
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
   * graph is the optional graph URI.
   */
  graph?: string;
}

/**
 * tripleSearchResultSchema is the Zod schema for TripleSearchResult.
 */
export const tripleSearchResultSchema: z.ZodType<TripleSearchResult> = z.object(
  {
    subject: z.string(),
    predicate: z.string(),
    object: z.string(),
    vecRank: z.number().nullable(),
    ftsRank: z.number().nullable(),
    score: z.number(),
    worldId: z.string().optional(),
  },
);
