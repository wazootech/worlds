import { z } from "zod";

/**
 * World represents a world in the Worlds API.
 */
export interface World {
  /**
   * id is the unique identifier of the world.
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
 * CreateWorldParams represents the parameters for creating a world.
 */
export interface CreateWorldParams {
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
 * createWorldParamsSchema is the Zod schema for CreateWorldParams.
 */
export const createWorldParamsSchema: z.ZodType<CreateWorldParams> = z.object({
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
});

/**
 * UpdateWorldParams represents the parameters for updating a world.
 */
export interface UpdateWorldParams {
  /**
   * slug is the updated URL-friendly name.
   */
  slug?: string;

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
 * updateWorldParamsSchema is the Zod schema for UpdateWorldParams.
 */
export const updateWorldParamsSchema: z.ZodType<UpdateWorldParams> = z.object({
  slug: z.string().optional(),
  label: z.string().optional(),
  description: z.string().nullable().optional(),
});
