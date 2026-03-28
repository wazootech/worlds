import { z } from "zod";

/**
 * Source is the ID of a source.
 */
export interface Source {
  /**
   * id is the ID of the source.
   */
  id: string;

  /**
   * write is true if the source is writable.
   */
  write?: boolean;

  /**
   * schema is true if the source contains schema information.
   */
  schema?: boolean;
}

export const sourceSchema: z.ZodType<Source> = z.object({
  id: z.string(),
  write: z.boolean().optional(),
  schema: z.boolean().optional(),
});

/**
 * limitParamSchema validates limit query parameters.
 * Ensures limit is within reasonable bounds (max 100).
 */
export const limitParamSchema: z.ZodType<number> = z.number().int().positive()
  .max(100);

/**
 * ErrorResponse is the standard error response format.
 */
export interface ErrorResponse {
  error: {
    message: string;
  };
}

/**
 * errorResponseSchema is the Zod schema for ErrorResponse.
 */
export const errorResponseSchema: z.ZodType<ErrorResponse> = z.object({
  error: z.object({
    message: z.string(),
  }),
});

/**
 * errorSchema extracts the error message from an ErrorResponse.
 */
// deno-lint-ignore no-explicit-any
export const errorSchema: z.ZodType<string, any, any> = errorResponseSchema
  .transform((data) => data.error.message);
