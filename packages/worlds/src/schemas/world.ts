import { z } from "zod";

/**
 * World represents a world in the Worlds API.
 */
export interface World {
  /**
   * id is the unique identifier of the world. In this architecture, it is equal to the slug.
   */
  id: string;

  /**
   * slug is the URL-friendly name of the world.
   */
  slug: string;

  /**
   * label is the human-readable name of the world.
   */
  label: string;

  /**
   * description is an optional human-readable description of the world.
   */
  description: string | null;

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
  deletedAt: number | null;
}

/**
 * worldSchema is the Zod schema for World.
 */
export const worldSchema: z.ZodType<World> = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

/**
 * WorldsCreateInput represents the parameters for creating a world.
 */
export interface WorldsCreateInput {
  /**
   * slug is the URL-friendly name for the new world.
   */
  slug: string;

  /**
   * label is the human-readable name for the new world.
   */
  label: string;

  /**
   * description is an optional human-readable description.
   */
  description?: string | null;
}

/**
 * worldsCreateInputSchema is the Zod schema for WorldsCreateInput.
 */
export const worldsCreateInputSchema: z.ZodType<WorldsCreateInput> = z.object({
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
});

/**
 * WorldsUpdateInput represents the parameters for updating a world.
 */
export interface WorldsUpdateInput {
  /**
   * world is the slug of the world to update.
   */
  world: string;

  /**
   * label is the updated human-readable name.
   */
  label?: string;

  /**
   * description is the updated human-readable description.
   */
  description?: string | null;
}

/**
 * worldsUpdateInputSchema is the Zod schema for WorldsUpdateInput.
 */
export const worldsUpdateInputSchema: z.ZodType<WorldsUpdateInput> = z.object({
  world: z.string().describe("The slug of the world to update."),
  label: z.string().optional(),
  description: z.string().nullable().optional(),
});

/**
 * WorldsGetInput represents the parameters for retrieving a world.
 */
export interface WorldsGetInput {
  /**
   * world is the slug of the world to retrieve.
   */
  world: string;
}

/**
 * worldsGetInputSchema is the Zod schema for WorldsGetInput.
 */
export const worldsGetInputSchema: z.ZodType<WorldsGetInput> = z.object({
  world: z.string().describe("The slug of the world to retrieve."),
});

/**
 * WorldsDeleteInput represents the parameters for deleting a world.
 */
export interface WorldsDeleteInput {
  /**
   * world is the slug of the world to delete.
   */
  world: string;
}

/**
 * worldsDeleteInputSchema is the Zod schema for WorldsDeleteInput.
 */
export const worldsDeleteInputSchema: z.ZodType<WorldsDeleteInput> = z.object({
  world: z.string().describe("The slug of the world to delete."),
});

