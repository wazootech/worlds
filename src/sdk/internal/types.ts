/**
 * AccountRecord represents an account in the Worlds API.
 */
export interface AccountRecord {
  id: string;
  description: string | null;
  plan: string | null;
  apiKey: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/**
 * CreateAccountParams represents the parameters for creating an account.
 */
export type CreateAccountParams = Omit<
  AccountRecord,
  "apiKey" | "createdAt" | "updatedAt" | "deletedAt"
>;

/**
 * PlanRecord represents a subscription plan.
 */
export interface PlanRecord {
  name: string;
  quotaRequestsPerMin: number;
  quotaStorageBytes: number;
}
