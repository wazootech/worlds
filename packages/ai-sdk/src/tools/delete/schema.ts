import { z } from "zod";

export { worldsDeleteInputSchema } from "@wazoo/worlds-sdk";
export type { WorldsDeleteInput } from "@wazoo/worlds-sdk";

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
