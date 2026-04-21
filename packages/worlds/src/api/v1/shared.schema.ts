import { z } from "../../shared/z.ts";

/**
 * WorldsContentType represents the supported RDF serialization content types.
 */
export type WorldsContentType =
  | "text/turtle"
  | "application/n-quads"
  | "application/n-triples"
  | "text/n3";

/**
 * worldsContentTypeSchema is the Zod schema for WorldsContentType.
 */
export const worldsContentTypeSchema = z.enum([


  "text/turtle",
  "application/n-quads",
  "application/n-triples",
  "text/n3",
]);

/**
 * WorldsSource represents a target world by identifier.
 */
export type WorldsSource =
  | string // "namespace/world" or "world"
  | (
    & { write?: boolean }
    & {
      name?: string;
      world?: string;
      id?: string;
      namespace?: string;
    }
  );

/**
 * worldsSourceSchema is the Zod schema for WorldsSource.
 */
export const worldsSourceSchema = z.union([


  z.string().describe("A source name: 'world' or 'namespace/world'"),
  z.object({
    write: z.boolean().optional().describe("Whether write access is enabled."),
    name: z.string().optional().describe(
      "A source name: 'world' or 'namespace/world'",
    ),
    world: z.string().optional().describe("A world identifier."),
    id: z.string().optional().describe("A world identifier (alias)."),
    namespace: z.string().optional().describe("A namespace identifier."),
  }),
]);

/**
 * ErrorResponseData is the standard error response format.
 */
export interface ErrorResponseData {
  error: {
    message: string;
  };
}

/**
 * errorResponseDataSchema is the Zod schema for ErrorResponseData.
 */
export const errorResponseDataSchema = z.object({


  error: z.object({
    message: z.string(),
  }),
});

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

export type ListWorldsRequest = z.infer<typeof listWorldsRequestSchema>;

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

export type ListWorldsResponse = z.infer<typeof listWorldsResponseSchema>;



/**
 * Log represents a log entry in the Worlds API.
 */
export interface Log {
  level: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * logSchema is the Zod schema for Log.
 */
export const logSchema = z.object({


  level: z.string(),
  message: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * ImportWorldRequest represents the parameters for importing data into a world.
 */
export const importWorldRequestSchema = z.object({
  source: worldsSourceSchema,
  data: z.union([z.string(), z.instanceof(ArrayBuffer)]),
  contentType: worldsContentTypeSchema.optional(),
});

export type ImportWorldRequest = z.infer<typeof importWorldRequestSchema>;

/**
 * ExportWorldRequest represents the parameters for exporting data from a world.
 */
export const exportWorldRequestSchema = z.object({
  source: worldsSourceSchema,
  contentType: worldsContentTypeSchema.optional(),
});

export type ExportWorldRequest = z.infer<typeof exportWorldRequestSchema>;


/**
 * QueryWorldRequest represents the parameters for executing a query against a world.
 */
export const queryWorldRequestSchema = z.object({
  source: worldsSourceSchema,
  query: z.string(),
});

export type QueryWorldRequest = z.infer<typeof queryWorldRequestSchema>;
