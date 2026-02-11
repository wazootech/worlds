import { z } from "zod";

/**
 * Organization represents an organization in the Worlds API.
 */
export interface Organization {
  id: string;
  label: string | null;
  description: string | null;
  plan: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/**
 * organizationSchema is the Zod schema for Organization.
 */
export const organizationSchema: z.ZodType<Organization> = z.object(
  {
    id: z.string(),
    label: z.string().nullable(),
    description: z.string().nullable(),
    plan: z.string().nullable(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  },
);

/**
 * CreateOrganizationParams represents the parameters for creating an organization.
 */
export interface CreateOrganizationParams {
  id: string;
  label?: string | null;
  description?: string | null;
  plan?: string | null;
}

/**
 * createOrganizationParamsSchema is the Zod schema for CreateOrganizationParams.
 */
export const createOrganizationParamsSchema: z.ZodType<
  CreateOrganizationParams
> = z.object(
  {
    id: z.string(),
    label: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    plan: z.string().nullable().optional(),
  },
);

/**
 * UpdateOrganizationParams represents the parameters for updating an organization.
 */
export interface UpdateOrganizationParams {
  label?: string | null;
  description?: string | null;
  plan?: string | null;
}

/**
 * updateOrganizationParamsSchema is the Zod schema for UpdateOrganizationParams.
 */
export const updateOrganizationParamsSchema: z.ZodType<
  UpdateOrganizationParams
> = z.object(
  {
    label: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    plan: z.string().nullable().optional(),
  },
);
