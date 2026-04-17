import { z } from "zod";

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
export const worldsContentTypeSchema: z.ZodType<WorldsContentType> = z.enum([
  "text/turtle",
  "application/n-quads",
  "application/n-triples",
  "text/n3",
]);

/**
 * WorldsSource represents a target world by name.
 * The name can be "world" (uses context namespace) or "namespace/world" (fully qualified).
 */
export type WorldsSource =
  | string // "namespace/world" or "world"
  | (
    & { write?: boolean }
    & { name: string } // "namespace/world" or "world"
  );

/**
 * worldsSourceSchema is the Zod schema for WorldsSource.
 */
export const worldsSourceSchema: z.ZodType<WorldsSource> = z.union([
  z.string().describe("A source name: 'world' or 'namespace/world'"),
  z.object({
    write: z.boolean().optional().describe("Whether write access is enabled."),
    name: z.string().describe("A source name: 'world' or 'namespace/world'"),
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
export const errorResponseDataSchema: z.ZodType<ErrorResponseData> = z.object({
  error: z.object({
    message: z.string(),
  }),
});

/**
 * WorldsListInput represents the parameters for listing worlds (pagination).
 */
export interface WorldsListInput {
  namespace?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * worldsListInputSchema is the Zod schema for WorldsListInput.
 */
export const worldsListInputSchema: z.ZodType<WorldsListInput> = z.object({
  namespace: z.string().optional(),
  pageSize: z.number().int().positive().max(1000).optional(),
  pageToken: z.string().optional(),
});

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
export const logSchema: z.ZodType<Log> = z.object({
  level: z.string(),
  message: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * WorldsImportInput represents the parameters for importing data into a world.
 */
export interface WorldsImportInput {
  source: WorldsSource;
  data: string | ArrayBuffer;
  contentType?: WorldsContentType;
}

/**
 * WorldsExportInput represents the parameters for exporting data from a world.
 */
export interface WorldsExportInput {
  source: WorldsSource;
  contentType?: WorldsContentType;
}

/**
 * WorldsQueryInput represents the parameters for executing a query against a world.
 */
export interface WorldsQueryInput {
  source: WorldsSource;
  query: string;
}
