import { z } from "zod";

/**
 * ServiceAccountTable represents a service account record.
 */
export interface ServiceAccountTable {
  id: string;
  organization_id: string;
  api_key: string;
  label: string | null;
  description: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * serviceAccountTableSchema represents the database schema for service accounts.
 */
const serviceAccountTableShape = z.object({
  id: z.string(),
  organization_id: z.string(),
  api_key: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const serviceAccountTableSchema: z.ZodType<ServiceAccountTable> =
  serviceAccountTableShape;

/**
 * ServiceAccountTableInsert represents the type for inserting a service account.
 */
export type ServiceAccountTableInsert = ServiceAccountTable;

/**
 * serviceAccountTableInsertSchema represents the data required to insert a new service account.
 */
export const serviceAccountTableInsertSchema: z.ZodType<
  ServiceAccountTableInsert
> = serviceAccountTableSchema;

/**
 * ServiceAccountTableUpdate represents the type for updating a service account.
 */
export type ServiceAccountTableUpdate = Pick<
  ServiceAccountTable,
  "label" | "description" | "updated_at"
>;

/**
 * serviceAccountTableUpdateSchema represents the data required to update a service account.
 */
export const serviceAccountTableUpdateSchema: z.ZodType<
  ServiceAccountTableUpdate
> = serviceAccountTableShape.pick({
  label: true,
  description: true,
  updated_at: true,
});

/**
 * CreateServiceAccountParams represents the parameters for creating a service account via the API.
 */
export interface CreateServiceAccountParams {
  id?: string;
  label?: string | null;
  description?: string | null;
}

/**
 * createServiceAccountSchema represents the data required to create a service account via the API.
 */
export const createServiceAccountSchema: z.ZodType<CreateServiceAccountParams> =
  z.object({
    id: z.string().optional(),
    label: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  });

/**
 * UpdateServiceAccountParams represents the parameters for updating a service account via the API.
 */
export interface UpdateServiceAccountParams {
  label?: string | null;
  description?: string | null;
}

/**
 * updateServiceAccountSchema represents the data required to update a service account via the API.
 */
export const updateServiceAccountSchema: z.ZodType<UpdateServiceAccountParams> =
  z.object({
    label: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  });
