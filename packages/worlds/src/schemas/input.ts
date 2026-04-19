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
export const worldsSourceSchema: z.ZodType<WorldsSource> = z.union([
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
 * worldsImportInputSchema is the Zod schema for WorldsImportInput.
 */
export const worldsImportInputSchema: z.ZodType<WorldsImportInput> = z.object({
  source: worldsSourceSchema,
  data: z.union([z.string(), z.instanceof(ArrayBuffer)]),
  contentType: worldsContentTypeSchema.optional(),
});

/**
 * WorldsExportInput represents the parameters for exporting data from a world.
 */
export interface WorldsExportInput {
  source: WorldsSource;
  contentType?: WorldsContentType;
}

/**
 * worldsExportInputSchema is the Zod schema for WorldsExportInput.
 */
export const worldsExportInputSchema: z.ZodType<WorldsExportInput> = z.object({
  source: worldsSourceSchema,
  contentType: worldsContentTypeSchema.optional(),
});

/**
 * WorldsQueryInput represents the parameters for executing a query against a world.
 */
export interface WorldsQueryInput {
  source: WorldsSource;
  query: string;
}
