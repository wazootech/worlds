import type { SearchResult as _SearchResult } from "@fartlabs/search-store";

/**
 * WorldsOptions are the options for the Worlds API SDK.
 */
export interface WorldsOptions {
  baseUrl: string;
  apiKey: string;
}

// TODO: Update SearchResultItem type for consistency with RDF/JS term types.

/**
 * SearchResult represents a search result.
 */
export type SearchResult = _SearchResult<{
  subject: string;
  predicate: string;
  object: string;
}>;

/**
 * CreateWorldParams represents the parameters for creating a world.
 */
export type CreateWorldParams = Omit<
  WorldRecord,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

/**
 * UpdateWorldParams represents the parameters for updating a world.
 */
export type UpdateWorldParams = Partial<CreateWorldParams>;

/**
 * WorldRecord represents a world in the Worlds API.
 */
export interface WorldRecord {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  isPublic: boolean;
}

/**
 * UsageBucketRecord represents usage statistics.
 */
export interface UsageBucketRecord {
  id: string;
  accountId: string;
  worldId: string;
  bucketStartTs: number;
  requestCount: number;
}
