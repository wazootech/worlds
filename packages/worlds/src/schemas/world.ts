import { z } from "zod";
import { defaultWorldsNamespace } from "#/core/ontology.ts";
import { type WorldsSource, worldsSourceSchema } from "./source.ts";

/**
 * World represents a world in the Worlds API.
 * Resource name format: {namespace}/{world} (computed, not stored)
 */
export interface World {
  /**
   * name is the full canonical resource name: namespaces/{namespace}/worlds/{world}.
   */
  name: string;

  /**
   * world is the URL-friendly identifier (resource ID segment).
   */
  world: string | null;

  /**
   * namespace is the optional parent namespace (optional - for multi-tenant).
   */
  namespace?: string | null;

  /**
   * label is the human-readable name of the world.
   */
  label?: string;

  /**
   * description is an optional human-readable description of the world.
   */
  description?: string;

  /**
   * createdAt is the millisecond timestamp of creation.
   */
  createdAt: number;

  /**
   * updatedAt is the millisecond timestamp of the last update.
   */
  updatedAt: number;

  /**
   * deletedAt is the millisecond timestamp of deletion, if applicable.
   */
  deletedAt?: number;
}

/**
 * worldSchema is the Zod schema for World.
 */
export const worldSchema: z.ZodType<World> = z.object({
  name: z.string().describe("The canonical resource name."),
  world: z.string().nullable().describe("The world identifier."),
  namespace: z.string().nullable().optional().describe(
    "The namespace (optional).",
  ),
  label: z.string().optional().describe("The display label."),
  description: z.string().optional().describe("The description."),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
});

/**
 * WorldsCreateInput represents the parameters for creating a world.
 */
export interface WorldsCreateInput {
  /**
   * world is the URL-friendly identifier for the new world.
   */
  world: string | null;

  /**
   * namespace is the parent namespace (optional - for multi-tenant).
   */
  namespace?: string | null;

  /**
   * label is the human-readable name for the new world.
   */
  label?: string;

  /**
   * description is an optional human-readable description.
   */
  description?: string;
}

/**
 * worldsCreateInputSchema is the Zod schema for WorldsCreateInput.
 */
export const worldsCreateInputSchema = z.object({
  world: z.string().nullable().describe("The world identifier."),
  namespace: z.string().nullable().optional().describe(
    "The namespace (optional).",
  ),
  label: z.string().optional().describe("The display label."),
  description: z.string().optional().describe("The description."),
}).superRefine((data, ctx) => {
  if (data.namespace === defaultWorldsNamespace) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Namespace "${defaultWorldsNamespace}" is reserved.`,
      path: ["namespace"],
    });
  }
}) as z.ZodType<WorldsCreateInput>;

/**
 * WorldsUpdateInput represents the parameters for updating a world.
 */
export interface WorldsUpdateInput {
  /**
   * source is the target world identification.
   */
  source: WorldsSource;

  /**
   * label is the updated human-readable name.
   */
  label?: string;

  /**
   * description is the updated human-readable description.
   */
  description?: string;
}

/**
 * worldsUpdateInputSchema is the Zod schema for WorldsUpdateInput.
 */
export const worldsUpdateInputSchema: z.ZodType<WorldsUpdateInput> = z.object({
  source: worldsSourceSchema.describe("The target world identification."),
  label: z.string().optional(),
  description: z.string().optional(),
});

/**
 * WorldsGetInput represents the parameters for retrieving a world.
 */
export interface WorldsGetInput {
  /**
   * source is the target world identification.
   */
  source: WorldsSource;
}

/**
 * worldsGetInputSchema is the Zod schema for WorldsGetInput.
 */
export const worldsGetInputSchema: z.ZodType<WorldsGetInput> = z.object({
  source: worldsSourceSchema.describe("The target world identification."),
});

/**
 * WorldsDeleteInput represents the parameters for deleting a world.
 */
export interface WorldsDeleteInput {
  /**
   * source is the target world identification.
   */
  source: WorldsSource;
}

/**
 * worldsDeleteInputSchema is the Zod schema for WorldsDeleteInput.
 */
export const worldsDeleteInputSchema: z.ZodType<WorldsDeleteInput> = z.object({
  source: worldsSourceSchema.describe("The target world identification."),
});
