import { z } from "zod";

/** WorldsDeleteInput is the input for deleting a world. */
export interface WorldsDeleteInput {
  world: string;
}

/** worldsDeleteInputSchema is the Zod schema for world deletion input. */
export const worldsDeleteInputSchema: z.ZodType<WorldsDeleteInput> = z.object({
  world: z.string().describe("The ID or slug of the world to delete."),
});

/** WorldsDeleteOutput is the output for deleting a world. */
export interface WorldsDeleteOutput {
  success: boolean;
}

/** worldsDeleteOutputSchema is the Zod schema for world deletion output. */
export const worldsDeleteOutputSchema: z.ZodType<WorldsDeleteOutput> = z.object(
  {
    success: z.boolean(),
  },
);
