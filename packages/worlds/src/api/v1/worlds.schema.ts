import { z } from "../../shared/z.ts";
import { worldSchema } from "../../resources/world.schema.ts";
import { sourceSchema } from "./shared.schema.ts";

/**
 * GetWorldRequest represents the parameters for retrieving a single world.
 */
export const getWorldRequestSchema = z.object({
  source: sourceSchema.describe("The world identifier or name."),
});

export type GetWorldRequest = z.infer<typeof getWorldRequestSchema>;


/**
 * CreateWorldRequest represents the parameters for creating a new world.
 */
export const createWorldRequestSchema = z.object({
  parent: z.string().optional().describe("The parent namespace."),
  id: z.string().optional().describe("A unique identifier for the world."),
  name: z.string().optional().describe("Alias for id (legacy)."),
  world: z.string().optional().describe("Alias for id (legacy)."),
  displayName: z.displayName(),
  description: z.string().optional(),
});

export type CreateWorldRequest = z.infer<typeof createWorldRequestSchema>;


/**
 * UpdateWorldRequest represents the parameters for updating a world.
 */
export const updateWorldRequestSchema = z.object({
  source: sourceSchema,
  displayName: z.displayName(),
  description: z.string().optional(),
});

export type UpdateWorldRequest = z.infer<typeof updateWorldRequestSchema>;


/**
 * DeleteWorldRequest represents the parameters for deleting a world.
 */
export const deleteWorldRequestSchema = z.object({
  source: sourceSchema,
});

export type DeleteWorldRequest = z.infer<typeof deleteWorldRequestSchema>;
