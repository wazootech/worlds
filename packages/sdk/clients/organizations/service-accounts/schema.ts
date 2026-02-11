import { z } from "zod";

/**
 * ServiceAccount represents a service account in the Worlds API.
 */
export interface ServiceAccount {
  id: string;
  organizationId: string;
  label: string | null;
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * serviceAccountSchema is the Zod schema for ServiceAccount.
 */
export const serviceAccountSchema: z.ZodType<ServiceAccount> = z.object({
  id: z.string(),
  organizationId: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * ServiceAccountCreated represents a newly created service account, including its API key.
 */
export interface ServiceAccountCreated extends ServiceAccount {
  apiKey: string;
}

/**
 * serviceAccountCreatedSchema is the Zod schema for ServiceAccountCreated.
 */
export const serviceAccountCreatedSchema: z.ZodType<ServiceAccountCreated> =
  serviceAccountSchema.and(
    z.object({
      apiKey: z.string(),
    }),
  );

/**
 * CreateServiceAccountParams represents the parameters for creating a service account.
 */
export interface CreateServiceAccountParams {
  id?: string;
  label?: string | null;
  description?: string | null;
}

/**
 * createServiceAccountParamsSchema is the Zod schema for CreateServiceAccountParams.
 */
export const createServiceAccountParamsSchema: z.ZodType<
  CreateServiceAccountParams
> = z.object({
  id: z.string().optional(),
  label: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

/**
 * UpdateServiceAccountParams represents the parameters for updating a service account.
 */
export interface UpdateServiceAccountParams {
  label?: string | null;
  description?: string | null;
}

/**
 * updateServiceAccountParamsSchema is the Zod schema for UpdateServiceAccountParams.
 */
export const updateServiceAccountParamsSchema: z.ZodType<
  UpdateServiceAccountParams
> = z.object({
  label: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
