import { z } from "zod";
export { type WorldsSource, worldsSourceSchema } from "#/schemas/input.ts";
import { worldsSourceSchema } from "#/schemas/input.ts";


/**
 * WorldId is a branded string for World identifiers.
 */
export const worldIdSchema = z.string().brand<"World">();
export type WorldId = z.infer<typeof worldIdSchema>;

/**
 * World represents a world in the Worlds API.
 * Resource name format: namespaces/{namespace}/worlds/{identifier}
 */
export const worldSchema = z.object({
  /**
   * name is the full canonical resource name: namespaces/{namespace}/worlds/{identifier}.
   */
  name: z.string().optional().describe(
    "@OutputOnly The canonical resource name.",
  ),

  /**
   * id is the unique identifier for the world.
   */
  id: worldIdSchema.optional().describe(
    "@Identifier @Immutable The world identifier.",
  ),

  /**
   * namespace is the optional parent namespace.
   */
  namespace: z.string().optional().describe(
    "@Immutable The namespace (optional).",
  ),

  /**
   * displayName is the human-readable name of the world.
   */
  displayName: z.string().optional().describe("The display label."),

  /**
   * description is an optional human-readable description of the world.
   */
  description: z.string().optional().describe("The description."),

  /**
   * createTime is the millisecond timestamp of creation.
   */
  createTime: z.number().describe("@OutputOnly The creation timestamp."),

  /**
   * updateTime is the millisecond timestamp of the last update.
   */
  updateTime: z.number().describe("@OutputOnly The last update timestamp."),

  /**
   * deleteTime is the millisecond timestamp of deletion, if applicable.
   */
  deleteTime: z.number().optional().describe(
    "@OutputOnly The deletion timestamp.",
  ),
});

/**
 * World represents a world in the Worlds API.
 */
export type World = z.infer<typeof worldSchema>;


/**
 * CreateWorldRequest represents the parameters for creating a world.
 */
export const createWorldRequestSchema = z.object({
  /**
   * name is the URL-friendly identifier for the new world.
   */
  name: z.string().optional().describe(
    "The world identifier: 'id' or 'ns/id'.",
  ),

  /**
   * world is an alias for name.
   */
  world: z.string().optional().describe("The world identifier (alias)."),

  /**
   * displayName is the human-readable name for the new world.
   */
  displayName: z.string().optional().describe("The display label."),

  /**
   * description is an optional human-readable description.
   */
  description: z.string().optional().describe("The description."),
}).refine((data) => data.name || data.world, {
  message: "Either 'name' or 'world' property is required",
  path: ["name"],
});

export type CreateWorldRequest = z.infer<typeof createWorldRequestSchema>;


/**
 * UpdateWorldRequest represents the parameters for updating a world.
 */
export const updateWorldRequestSchema = z.object({
  /**
   * source is the target world identification.
   */
  source: worldsSourceSchema.describe("The target world identification."),

  /**
   * displayName is the updated human-readable name.
   */
  displayName: z.string().optional(),

  /**
   * description is the updated human-readable description.
   */
  description: z.string().optional(),
});

export type UpdateWorldRequest = z.infer<typeof updateWorldRequestSchema>;


/**
 * GetWorldRequest represents the parameters for retrieving a world.
 */
export const getWorldRequestSchema = z.object({
  /**
   * source is the target world identification.
   */
  source: worldsSourceSchema.describe("The target world identification."),
});

export type GetWorldRequest = z.infer<typeof getWorldRequestSchema>;


/**
 * DeleteWorldRequest represents the parameters for deleting a world.
 */
export const deleteWorldRequestSchema = z.object({
  /**
   * source is the target world identification.
   */
  source: worldsSourceSchema.describe("The target world identification."),
});

export type DeleteWorldRequest = z.infer<typeof deleteWorldRequestSchema>;


// Re-exports from schemas/input.ts
export type {
  ExportWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
} from "#/schemas/input.ts";


// Re-exports from search.schema.ts
export { searchWorldRequestSchema, searchWorldResultSchema } from "./search.schema.ts";
export type { SearchWorldRequest, SearchWorldResult } from "./search.schema.ts";


// Re-exports from sparql.schema.ts
export {
  getServiceDescriptionRequestSchema,
  sparqlQueryRequestSchema,
  sparqlQueryResultSchema,
} from "./sparql.schema.ts";
export type {
  GetServiceDescriptionRequest,
  SparqlQueryRequest,
  SparqlQueryResult,
} from "./sparql.schema.ts";

