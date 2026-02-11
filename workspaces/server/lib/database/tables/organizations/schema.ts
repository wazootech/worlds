import { z } from "zod";

/**
 * OrganizationTable represents an organization record as stored in the database.
 */
export interface OrganizationTable {
  id: string;
  label: string | null;
  description: string | null;
  plan: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/**
 * organizationTableSchema is the Zod schema for the organizations database table.
 * This represents the raw database row structure.
 */
const organizationTableShape = z.object({
  id: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  plan: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
  deleted_at: z.number().nullable(),
});

export const organizationTableSchema: z.ZodType<OrganizationTable> =
  organizationTableShape;

/**
 * OrganizationTableInsert represents the data needed to insert a new organization.
 */
export type OrganizationTableInsert = OrganizationTable;

/**
 * organizationTableInsertSchema is the Zod schema for inserting a new organization.
 */
export const organizationTableInsertSchema: z.ZodType<
  OrganizationTableInsert
> = organizationTableSchema;

/**
 * OrganizationTableUpdate represents the data needed to update an organization.
 */
export type OrganizationTableUpdate = Partial<
  Pick<OrganizationTable, "label" | "description" | "plan" | "updated_at">
>;

/**
 * organizationTableUpdateSchema is the Zod schema for updating an organization.
 */
export const organizationTableUpdateSchema: z.ZodType<
  OrganizationTableUpdate
> = organizationTableShape
  .pick({ label: true, description: true, plan: true, updated_at: true })
  .partial();

/**
 * OrganizationRow represents an organization record.
 */
export type OrganizationRow = OrganizationTable;

/**
 * organizationRowSchema is the Zod schema for an organization record as returned by the SELECT queries.
 */
export const organizationRowSchema: z.ZodType<OrganizationRow> =
  organizationTableSchema;
