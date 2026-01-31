import { z } from "zod";

/**
 * PaginationParams represents validated pagination parameters.
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * paginationParamsSchema is the Zod schema for PaginationParams.
 */
export const paginationParamsSchema: z.ZodType<PaginationParams> = z.object({
  page: z.number().int().positive().max(10000).default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

/**
 * limitParamSchema validates limit query parameters.
 * Ensures limit is within reasonable bounds (max 100).
 */
export const limitParamSchema: z.ZodType<number> = z.number().int().positive()
  .max(100);
