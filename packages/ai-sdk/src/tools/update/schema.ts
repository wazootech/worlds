import { z } from "zod";
import type { UpdateWorldParams } from "@wazoo/worlds-sdk";

/** WorldsUpdateInput is the input for updating a world. */
export interface WorldsUpdateInput extends UpdateWorldParams {
  world: string;
}

/** worldsUpdateInputSchema is the Zod schema for world update input. */
export const worldsUpdateInputSchema: z.ZodType<WorldsUpdateInput> = z.object({
  world: z.string().describe("The ID or slug of the world to update."),
  slug: z.string().optional(),
  label: z.string().optional(),
  description: z.string().nullable().optional(),
});

/** WorldsUpdateOutput is the output for updating a world. */
export interface WorldsUpdateOutput {
  success: boolean;
}

/** WorldsUpdateOutput is the type for the update tool output. */
export const worldsUpdateOutputSchema: z.ZodType<WorldsUpdateOutput> = z.object(
  {
    success: z.boolean(),
  },
);
