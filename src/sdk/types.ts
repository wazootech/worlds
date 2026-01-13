import type { SearchResult as _SearchResult } from "@fartlabs/search-store";

/**
 * SearchResult represents a search result.
 */
export type SearchResult = _SearchResult<{
  subject: string;
  predicate: string;
  object: string;
}>;

/**
 * AccountRecord represents an account in the Worlds API.
 */
export interface AccountRecord {
  id: string;
  description: string | null;
  planType: string;
  apiKey: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type CreateAccountParams = Omit<
  AccountRecord,
  "id" | "apiKey" | "createdAt" | "updatedAt" | "deletedAt"
>;

/**
 * PlanRecord represents a subscription plan.
 */
export interface PlanRecord {
  planType: string;
  quotaRequestsPerMin: number;
  quotaStorageBytes: number;
}

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
