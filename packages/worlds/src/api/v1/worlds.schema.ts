import { z } from "../../z.ts";
import { worldSchema, type World } from "../../resources/world.schema.ts";
import { type ContentType, contentTypeSchema } from "./common.schema.ts";
import { sourceSchema, type Source } from "./source.schema.ts";

/**
 * GetWorldRequest represents the parameters for retrieving a single world.
 */
export const getWorldRequestSchema = z.object({
  source: sourceSchema.describe("The world identifier or name."),
});

export interface GetWorldRequest {
  source: Source;
}


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

export interface CreateWorldRequest {
  parent?: string;
  id?: string;
  name?: string;
  world?: string;
  displayName?: string;
  description?: string;
}


/**
 * UpdateWorldRequest represents the parameters for updating a world.
 */
export const updateWorldRequestSchema = z.object({
  source: sourceSchema,
  displayName: z.displayName(),
  description: z.string().optional(),
});

export interface UpdateWorldRequest {
  source: Source;
  displayName?: string;
  description?: string;
}


/**
 * DeleteWorldRequest represents the parameters for deleting a world.
 */
export const deleteWorldRequestSchema = z.object({
  source: sourceSchema,
});

export interface DeleteWorldRequest {
  source: Source;
}

/**
 * ListWorldsRequest represents the parameters for listing worlds (pagination).
 */
export const listWorldsRequestSchema = z.object({
  parent: z.string().optional().describe(
    "The parent resource name (e.g., 'namespaces/default').",
  ),
  pageSize: z.number().int().positive().max(1000).optional().describe(
    "Maximum number of results to return.",
  ),
  pageToken: z.string().optional().describe("A page token for pagination."),
});

export interface ListWorldsRequest {
  parent?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * ListWorldsResponse represents the results of listing worlds.
 */
export const listWorldsResponseSchema = z.object({
  /**
   * worlds is the list of worlds.
   */
  worlds: z.array(z.any()).describe("The list of worlds."),

  /**
   * nextPageToken is a token to retrieve the next page of results.
   */
  nextPageToken: z.string().optional().describe(
    "A token to retrieve the next page of results.",
  ),
});

export interface ListWorldsResponse {
  worlds: World[];
  nextPageToken?: string;
}

/**
 * ImportWorldRequest represents the parameters for importing data into a world.
 */
export const importWorldRequestSchema = z.object({
  source: sourceSchema,
  data: z.union([z.string(), z.instanceof(ArrayBuffer)]),
  contentType: contentTypeSchema.optional(),
});

export interface ImportWorldRequest {
  source: Source;
  data: string | ArrayBuffer;
  contentType?: ContentType;
}

/**
 * ExportWorldRequest represents the parameters for exporting data from a world.
 */
export const exportWorldRequestSchema = z.object({
  source: sourceSchema,
  contentType: contentTypeSchema.optional(),
});

export interface ExportWorldRequest {
  source: Source;
  contentType?: ContentType;
}

/**
 * QueryWorldRequest represents the parameters for executing a query against a world.
 */
export const queryWorldRequestSchema = z.object({
  source: sourceSchema,
  query: z.string(),
});

export interface QueryWorldRequest {
  source: Source;
  query: string;
}
