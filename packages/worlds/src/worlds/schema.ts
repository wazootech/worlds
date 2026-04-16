import { z } from "zod";
import { type WorldsSource, worldsSourceSchema } from "#/schema.ts";


/**
 * World represents a world in the Worlds API.
 * Resource name format: {namespace}/{identifier} (computed, not stored)
 */
export interface World {
  /**
   * name is the full canonical resource name: namespaces/{namespace}/worlds/{identifier}.
   * Computed from namespace + id when needed.
   */
  name?: string;

  /**
   * id is the unique identifier for the world.
   */
  id?: string;

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
  name: z.string().optional().describe("The canonical resource name."),
  id: z.string().optional().describe("The world identifier."),
  namespace: z.string().optional().describe(
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
   * name is the URL-friendly identifier for the new world.
   * Can be "identifier" (uses default namespace) or "namespace/identifier".
   */
  name: string;

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
  name: z.string().describe("The world identifier: 'id' or 'ns/id'."),
  label: z.string().optional().describe("The display label."),
  description: z.string().optional().describe("The description."),
});

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

// Re-exports from schema.ts
export type {
  WorldsExportInput,
  WorldsImportInput,
  WorldsListInput,
} from "#/schema.ts";

// Re-exports from search.schema.ts
export type {
  WorldsSearchInput,
  WorldsSearchOutput,
} from "./search.schema.ts";

// Re-exports from sparql.schema.ts
export type {
  WorldsServiceDescriptionInput,
  WorldsSparqlInput,
  WorldsSparqlOutput,
} from "./sparql.schema.ts";
