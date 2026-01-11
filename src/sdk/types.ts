/**
 * Account represents an account in the Worlds API.
 */
export interface Account {
  id: string;
  description: string | null;
  planType: string;
  apiKey: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type CreateAccountParams = Omit<
  Account,
  "id" | "apiKey" | "createdAt" | "updatedAt" | "deletedAt"
>;

/**
 * Plan represents a subscription plan.
 */
export interface Plan {
  planType: string;
  quotaRequestsPerMin: number;
  quotaStorageBytes: number;
}

/**
 * World represents a world in the Worlds API.
 */
export interface World {
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
 * UsageBucket represents usage statistics.
 */
export interface UsageBucket {
  id: string;
  accountId: string;
  worldId: string;
  bucketStartTs: number;
  requestCount: number;
}
