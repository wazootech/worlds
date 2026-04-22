import type { components } from "./types.generated.ts";

/**
 * SearchWorldsResult represents a single match from a semantic search.
 */
export type SearchWorldsResult = components["schemas"]["SearchResult"];

/**
 * SearchWorldsRequest represents a request to perform semantic search across worlds.
 */
export type SearchWorldsRequest = components["schemas"]["SearchWorldsRequest"];

/**
 * SearchWorldsResponse represents the results of a search operation.
 */
export type SearchWorldsResponse = {
  results: SearchWorldsResult[];
  nextPageToken?: string;
};
