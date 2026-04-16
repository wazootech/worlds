import { z } from "zod";
import type { WorldsContentType } from "./rdf-content-type.ts";
import { worldsContentTypeSchema } from "./rdf-content-type.ts";

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
  /**
   * error contains the detailed error information.
   */
  error: {
    /**
     * message is the human-readable error description.
     */
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
  /**
   * namespace is the optional namespace to list worlds within.
   */
  namespace?: string;

  /**
   * pageSize is the maximum number of items to return.
   * If unspecified, defaults to a server-chosen value (typically 50).
   * Maximum value is 1000; values above will be coerced to 1000.
   */
  pageSize?: number;

  /**
   * pageToken is a token received from a previous ListWorlds call.
   * Use this to retrieve the next page.
   */
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
 * WorldsImportInput represents the parameters for importing data into a world.
 */
export interface WorldsImportInput {
  /**
   * source is the target world identification.
   */
  source: WorldsSource;

  /**
   * data is the RDF data to import (string or Buffer).
   */
  data: string | ArrayBuffer;

  /**
   * contentType is the RDF content type of the data.
   */
  contentType?: WorldsContentType;
}

/**
 * worldsImportInputSchema is the Zod schema for WorldsImportInput.
 */
export const worldsImportInputSchema: z.ZodType<WorldsImportInput> = z.object({
  source: worldsSourceSchema.describe("The target world identification."),
  data: z.union([z.string(), z.instanceof(ArrayBuffer)]).describe(
    "The RDF data to import.",
  ),
  contentType: worldsContentTypeSchema.optional().describe(
    "The RDF content type.",
  ),
});

/**
 * WorldsExportInput represents the parameters for exporting data from a world.
 */
export interface WorldsExportInput {
  /**
   * source is the target world identification.
   */
  source: WorldsSource;

  /**
   * contentType is the requested RDF content type.
   */
  contentType?: WorldsContentType;
}

/**
 * worldsExportInputSchema is the Zod schema for WorldsExportInput.
 */
export const worldsExportInputSchema: z.ZodType<WorldsExportInput> = z.object({
  source: worldsSourceSchema.describe("The target world identification."),
  contentType: worldsContentTypeSchema.optional().describe(
    "The requested RDF content type.",
  ),
});

/**
 * WorldsQueryInput represents the parameters for executing a query against a world.
 */
export interface WorldsQueryInput {
  /**
   * source is the target world identification.
   */
  source: WorldsSource;

  /**
   * query is the SPARQL query to execute.
   */
  query: string;
}

/**
 * worldsQueryInputSchema is the Zod schema for WorldsQueryInput.
 */
export const worldsQueryInputSchema: z.ZodType<WorldsQueryInput> = z.object({
  source: worldsSourceSchema.describe("The target world identification."),
  query: z.string().describe("The SPARQL query to execute."),
});
