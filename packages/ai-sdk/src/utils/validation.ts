import { z } from "zod";

/**
 * WorldSourceSchema identifies a world by name, id, or namespace.
 */
export const WorldSourceSchema = z.union([
  z.string(),
  z.object({
    namespace: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    mode: z.enum(["write", "read", "deferred"]).optional(),
  }),
]);

/**
 * WorldSchema is the Zod schema for a World resource (output).
 */
export const WorldSchema = z.object({
  id: z.string(),
  namespace: z.string().optional(),
  displayName: z.string(),
  description: z.string().optional(),
  createTime: z.number().optional(),
  updateTime: z.number().optional(),
  deleteTime: z.number().optional().nullable(),
});

/**
 * ListWorldsRequestSchema is the input for listing worlds.
 */
export const ListWorldsRequestSchema = z.object({
  parent: z.string().optional(),
  pageSize: z.number().optional(),
  pageToken: z.string().optional(),
});

/**
 * GetWorldRequestSchema is the input for getting a world.
 */
export const GetWorldRequestSchema = z.object({
  source: WorldSourceSchema,
});

/**
 * CreateWorldRequestSchema is the input for creating a world.
 */
export const CreateWorldRequestSchema = z.object({
  parent: z.string().optional(),
  id: z.string().optional(),
  displayName: z.string(),
  description: z.string().optional(),
});

/**
 * UpdateWorldRequestSchema is the input for updating a world.
 */
export const UpdateWorldRequestSchema = z.object({
  source: WorldSourceSchema,
  displayName: z.string().optional(),
  description: z.string().optional(),
});

/**
 * DeleteWorldRequestSchema is the input for deleting a world.
 */
export const DeleteWorldRequestSchema = z.object({
  source: WorldSourceSchema,
});

/**
 * SearchWorldsRequestSchema is the input for semantic search.
 */
export const SearchWorldsRequestSchema = z.object({
  query: z.string(),
  sources: z.array(WorldSourceSchema).optional(),
  parent: z.string().optional(),
  pageSize: z.number().optional(),
  pageToken: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  predicates: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
});

/**
 * SearchWorldsResultSchema is the result match for search.
 */
export const SearchWorldsResultSchema = z.object({
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  score: z.number(),
  world: WorldSchema,
});

/**
 * SparqlQueryRequestSchema is the input for SPARQL queries.
 */
export const SparqlQueryRequestSchema = z.object({
  sources: z.array(WorldSourceSchema).optional(),
  parent: z.string().optional(),
  query: z.string(),
});

/**
 * ExportWorldRequestSchema is the input for exporting data.
 */
export const ExportWorldRequestSchema = z.object({
  source: WorldSourceSchema,
  contentType: z.enum([
    "text/turtle",
    "application/n-quads",
    "application/n-triples",
    "text/n3",
  ]).optional(),
});

/**
 * ImportWorldRequestSchema is the input for importing data.
 */
export const ImportWorldRequestSchema = z.object({
  source: WorldSourceSchema,
  data: z.string(),
  contentType: z.enum([
    "text/turtle",
    "application/n-quads",
    "application/n-triples",
    "text/n3",
  ]).optional(),
});
