import { z } from "zod";

/**
 * tenantTableSchema is the Zod schema for the tenants database table.
 * This represents the raw database row structure.
 */
export const tenantTableSchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  plan: z.string().nullable(),
  api_key: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
  deleted_at: z.number().nullable(),
});

/**
 * TenantTable represents a tenant record as stored in the database.
 */
export type TenantTable = z.infer<typeof tenantTableSchema>;

/**
 * tenantTableInsertSchema is the Zod schema for inserting a new tenant.
 */
export const tenantTableInsertSchema = tenantTableSchema;

/**
 * TenantTableInsert represents the data needed to insert a new tenant.
 */
export type TenantTableInsert = z.infer<typeof tenantTableInsertSchema>;

/**
 * tenantTableUpdateSchema is the Zod schema for updating a tenant.
 */
export const tenantTableUpdateSchema = tenantTableSchema
  .pick({ label: true, description: true, plan: true, updated_at: true })
  .partial();

/**
 * TenantTableUpdate represents the data needed to update a tenant.
 */
export type TenantTableUpdate = z.infer<typeof tenantTableUpdateSchema>;

/**
 * tenantRowSchema is the Zod schema for a tenant record as returned by the SELECT queries.
 */
export const tenantRowSchema = tenantTableSchema;

/**
 * TenantRow represents a tenant record.
 */
export type TenantRow = z.infer<typeof tenantRowSchema>;
