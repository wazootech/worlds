import { z } from "zod";
import { type WorldsContentType, worldsContentTypeSchema } from "./sparql.ts";

/**
 * WorldSource represents a target world by slug, qualified name, or name object.
 */
export type WorldSource =
  | string
  | { slug: string; namespace?: string; write?: boolean; schema?: boolean }
  | { name: string; write?: boolean; schema?: boolean };

/**
 * Source is a backward-compatibility alias for WorldSource.
 * @deprecated Use WorldSource instead.
 */
export type Source = WorldSource;

/**
 * worldSourceSchema is the Zod schema for WorldSource.
 */
export const worldSourceSchema = z.union([
  z.string().describe("A qualified source name: <namespace>/<slug>"),
  z.object({
    slug: z.string().describe("The slug of the target world."),
    namespace: z.string().optional().describe(
      "The optional namespace of the target world.",
    ),
    write: z.boolean().optional().describe("Whether write access is enabled."),
    schema: z.boolean().optional().describe(
      "Whether this source should be treated as a schema source.",
    ),
  }),
  z.object({
    name: z.string().describe("A qualified source name: <namespace>/<slug>"),
    write: z.boolean().optional().describe("Whether write access is enabled."),
    schema: z.boolean().optional().describe(
      "Whether this source should be treated as a schema source.",
    ),
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
   * page is the 1-indexed page number to fetch.
   */
  page?: number;

  /**
   * pageSize is the number of items per page.
   */
  pageSize?: number;
}

/**
 * worldsListInputSchema is the Zod schema for WorldsListInput.
 */
export const worldsListInputSchema: z.ZodType<WorldsListInput> = z.object({
  namespace: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

/**
 * WorldsImportInput represents the parameters for importing data into a world.
 */
export interface WorldsImportInput {
  /**
   * source is the target world identification.
   */
  source: WorldSource;

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
  source: worldSourceSchema.describe("The target world identification."),
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
  source: WorldSource;

  /**
   * contentType is the requested RDF content type.
   */
  contentType?: WorldsContentType;
}

/**
 * worldsExportInputSchema is the Zod schema for WorldsExportInput.
 */
export const worldsExportInputSchema: z.ZodType<WorldsExportInput> = z.object({
  source: worldSourceSchema.describe("The target world identification."),
  contentType: worldsContentTypeSchema.optional().describe(
    "The requested RDF content type.",
  ),
});
