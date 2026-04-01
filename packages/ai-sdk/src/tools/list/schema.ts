import { z } from "zod";
import type { PaginationParams, World } from "@wazoo/worlds-sdk";
import { paginationParamsSchema, worldSchema } from "@wazoo/worlds-sdk";

/** WorldsListInput is the input for listing worlds. */
export interface WorldsListInput extends PaginationParams {}

/** worldsListInputSchema is the Zod schema for world listing input. */
export const worldsListInputSchema: z.ZodType<WorldsListInput> =
  paginationParamsSchema;

/** WorldsListOutput is the output for listing worlds. */
export interface WorldsListOutput {
  worlds: World[];
}

/** worldsListOutputSchema is the Zod schema for world listing output. */
export const worldsListOutputSchema: z.ZodType<WorldsListOutput> = z.object({
  worlds: z.array(worldSchema),
});
