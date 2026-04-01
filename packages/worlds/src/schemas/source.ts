import { z } from "zod";

/**
 * Source represents a data source world by ID or slug.
 */
export interface Source {
  /**
   * world is the ID or slug of the source world.
   */
  world: string;

  /**
   * write indicates if write access is enabled for this source.
   */
  write?: boolean;

  /**
   * schema indicates if this source should be treated as a schema source.
   */
  schema?: boolean;
}

/**
 * sourceSchema is the Zod schema for Source.
 */
export const sourceSchema: z.ZodType<Source> = z.object({
  world: z.string().describe("The ID or slug of the source world."),
  write: z.boolean().optional().describe("Whether write access is enabled."),
  schema: z.boolean().optional().describe(
    "Whether this source should be treated as a schema source.",
  ),
});

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
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});
import { type WorldsContentType, worldsContentTypeSchema } from "./sparql.ts";

/**
 * WorldsImportInput represents the parameters for importing data into a world.
 */
export interface WorldsImportInput {
  /**
   * world is the ID or slug of the target world.
   */
  world: string;

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
  world: z.string().describe("The ID or slug of the target world."),
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
   * world is the ID or slug of the target world.
   */
  world: string;

  /**
   * contentType is the requested RDF content type.
   */
  contentType?: WorldsContentType;
}

/**
 * worldsExportInputSchema is the Zod schema for WorldsExportInput.
 */
export const worldsExportInputSchema: z.ZodType<WorldsExportInput> = z.object({
  world: z.string().describe("The ID or slug of the target world."),
  contentType: worldsContentTypeSchema.optional().describe(
    "The requested RDF content type.",
  ),
});
