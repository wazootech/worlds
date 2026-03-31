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
 * PaginationParams represents the parameters for pagination.
 */
export interface PaginationParams {
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
 * paginationParamsSchema is the Zod schema for PaginationParams.
 */
export const paginationParamsSchema: z.ZodType<PaginationParams> = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});
