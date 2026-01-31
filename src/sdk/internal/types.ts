/**
 * TenantRecord represents a tenant in the Worlds API.
 */
export interface TenantRecord {
  id: string;
  description?: string;
  plan?: string;
  apiKey: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/**
 * CreateTenantParams represents the parameters for creating a tenant.
 */
export type CreateTenantParams = Omit<
  TenantRecord,
  "apiKey" | "createdAt" | "updatedAt" | "deletedAt"
>;

/**
 * UpdateTenantParams represents the parameters for updating a tenant.
 */
export type UpdateTenantParams = Partial<CreateTenantParams>;

/**
 * InviteRecord represents an invite in the Worlds API.
 */
export interface InviteRecord {
  code: string;
  createdAt: number;
  redeemedBy?: string;
  redeemedAt?: number;
}

/**
 * CreateInviteParams represents the parameters for creating an invite.
 */
export interface CreateInviteParams {
  code?: string;
}
