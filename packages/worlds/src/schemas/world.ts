import { z } from "zod";

/**
 * World represents a world in the Worlds API.
 * Resource name format: {namespace}/{world} (computed, not stored)
 */
export interface World {
  /**
   * world is the URL-friendly identifier (resource ID segment).
   */
  world: string;

  /**
   * namespace is the optional parent namespace (optional - for multi-tenant).
   */
  namespace?: string;

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
  world: z.string().describe("The world identifier."),
  namespace: z.string().optional().describe("The namespace (optional)."),
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
  world: string;

  /**
   * namespace is the parent namespace (optional - for multi-tenant).
   */
  namespace?: string;

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
export const worldsCreateInputSchema: z.ZodType<WorldsCreateInput> = z.object({
  world: z.string().describe("The world identifier."),
  namespace: z.string().optional().describe("The namespace (optional)."),
  label: z.string().optional().describe("The display label."),
  description: z.string().optional().describe("The description."),
});

/**
 * WorldsUpdateInput represents the parameters for updating a world.
 */
export interface WorldsUpdateInput {
  /**
   * world is the identifier of the world to update.
   */
  world: string;

  /**
   * namespace is the parent namespace (for namespaced lookups).
   */
  namespace?: string;

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
  world: z.string().describe("The world to update."),
  namespace: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
});

/**
 * WorldsGetInput represents the parameters for retrieving a world.
 */
export interface WorldsGetInput {
  /**
   * world is the identifier of the world to retrieve.
   */
  world: string;

  /**
   * namespace is the parent namespace (for namespaced lookups).
   */
  namespace?: string;
}

/**
 * worldsGetInputSchema is the Zod schema for WorldsGetInput.
 */
export const worldsGetInputSchema: z.ZodType<WorldsGetInput> = z.object({
  world: z.string().describe("The world to retrieve."),
  namespace: z.string().optional(),
});

/**
 * WorldsDeleteInput represents the parameters for deleting a world.
 */
export interface WorldsDeleteInput {
  /**
   * world is the identifier of the world to delete.
   */
  world: string;

  /**
   * namespace is the parent namespace (for namespaced lookups).
   */
  namespace?: string;
}

/**
 * worldsDeleteInputSchema is the Zod schema for WorldsDeleteInput.
 */
export const worldsDeleteInputSchema: z.ZodType<WorldsDeleteInput> = z.object({
  world: z.string().describe("The world to delete."),
  namespace: z.string().optional(),
});

