import { z } from "zod";

/**
 * TenantRecord represents a tenant in the Worlds API.
 */
export interface TenantRecord {
  id: string;
  label: string | null;
  description: string | null;
  plan: string | null;
  apiKey: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/**
 * tenantRecordSchema is the Zod schema for TenantRecord.
 */
export const tenantRecordSchema: z.ZodType<TenantRecord> = z.object({
  id: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  plan: z.string().nullable(),
  apiKey: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

/**
 * CreateTenantParams represents the parameters for creating a tenant.
 */
export interface CreateTenantParams {
  id: string;
  label?: string | null;
  description?: string | null;
  plan?: string | null;
}

/**
 * createTenantParamsSchema is the Zod schema for CreateTenantParams.
 */
export const createTenantParamsSchema: z.ZodType<CreateTenantParams> = z.object(
  {
    id: z.string(),
    label: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    plan: z.string().nullable().optional(),
  },
);

/**
 * UpdateTenantParams represents the parameters for updating a tenant.
 */
export interface UpdateTenantParams {
  label?: string | null;
  description?: string | null;
  plan?: string | null;
}

/**
 * updateTenantParamsSchema is the Zod schema for UpdateTenantParams.
 */
export const updateTenantParamsSchema: z.ZodType<UpdateTenantParams> = z.object(
  {
    label: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    plan: z.string().nullable().optional(),
  },
);
