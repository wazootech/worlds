import { z } from "../../shared/z.ts";

/**
 * ContentType represents the supported RDF serialization content types.
 */
export type ContentType =
  | "text/turtle"
  | "application/n-quads"
  | "application/n-triples"
  | "text/n3";

/**
 * contentTypeSchema is the Zod schema for ContentType.
 */
export const contentTypeSchema = z.enum([
  "text/turtle",
  "application/n-quads",
  "application/n-triples",
  "text/n3",
]);

/**
 * TransactionMode represents the transaction behavior for a source access.
 * Consistent with Turso/libsql.
 */
export type TransactionMode = "write" | "read" | "deferred";

/**
 * transactionModeSchema is the Zod schema for TransactionMode.
 */
export const transactionModeSchema = z.enum(["write", "read", "deferred"]);

/**
 * BaseSource contains common properties for all object-based world sources.
 */
export interface BaseSource {
  /**
   * mode indicates the transaction behavior for the source access.
   */
  mode?: TransactionMode;
}

/**
 * NamedSource identifies a world by a single name string in an object.
 */
export interface NamedSource extends BaseSource {
  /**
   * name is the source identifier (e.g. "world" or "namespace/world").
   */
  name: string;
}

/**
 * IdSource identifies a world using its unique identifier.
 */
export interface IdSource extends BaseSource {
  /**
   * id is the world identifier.
   */
  id: string;
}

/**
 * NamespaceSource identifies a target namespace.
 */
export interface NamespaceSource extends BaseSource {
  /**
   * namespace is the namespace identifier.
   */
  namespace: string;
}

/**
 * FullyQualifiedSource identifies a world by both namespace and id.
 */
export interface FullyQualifiedSource extends BaseSource {
  /**
   * namespace is the namespace identifier.
   */
  namespace: string;

  /**
   * id is the world identifier.
   */
  id: string;
}

/**
 * QualifiedSource represents any explicitly qualified target (id and/or namespace).
 */
export type QualifiedSource =
  | IdSource
  | NamespaceSource
  | FullyQualifiedSource;

/**
 * SourceObject is a union of object-based world identifiers.
 */
export type SourceObject =
  | BaseSource
  | NamedSource
  | QualifiedSource;

/**
 * Source represents a target world by identifier.
 */
export type Source =
  | string // "namespace/world" or "world"
  | SourceObject;

/**
 * sourceSchema is the Zod schema for Source.
 */
export const sourceSchema = z.union([
  z.string().describe("A source name: 'world' or 'namespace/world'"),
  z.intersection(
    z.object({
      mode: transactionModeSchema.optional().describe(
        "The transaction mode (write, read, or deferred).",
      ),
    }),
    z.union([
      z.object({
        name: z.string().describe(
          "A source name: 'world' or 'namespace/world'",
        ),
      }),
      z.object({
        id: z.string().describe("A world identifier."),
        namespace: z.string().optional().describe("A namespace identifier."),
      }),
      z.object({
        namespace: z.string().describe("A namespace identifier."),
        id: z.string().optional().describe("A world identifier."),
      }),
      z.object({}).describe("Default Source (all identifiers omitted)"),
    ]),
  ),
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
  source: sourceSchema,
  data: z.union([z.string(), z.instanceof(ArrayBuffer)]),
  contentType: contentTypeSchema.optional(),
});

export type ImportWorldRequest = z.infer<typeof importWorldRequestSchema>;

/**
 * ExportWorldRequest represents the parameters for exporting data from a world.
 */
export const exportWorldRequestSchema = z.object({
  source: sourceSchema,
  contentType: contentTypeSchema.optional(),
});

export type ExportWorldRequest = z.infer<typeof exportWorldRequestSchema>;

/**
 * QueryWorldRequest represents the parameters for executing a query against a world.
 */
export const queryWorldRequestSchema = z.object({
  source: sourceSchema,
  query: z.string(),
});

export type QueryWorldRequest = z.infer<typeof queryWorldRequestSchema>;
