import { z } from "zod";

export { worldsUpdateInputSchema } from "@wazoo/worlds-sdk";
export type { WorldsUpdateInput } from "@wazoo/worlds-sdk";

/** WorldsUpdateOutput is the output for updating a world in the AI SDK. */
export interface WorldsUpdateOutput {
  success: boolean;
}

/** worldsUpdateOutputSchema is the type for the update tool output. */
export const worldsUpdateOutputSchema: z.ZodType<WorldsUpdateOutput> = z.object(
  {
    success: z.boolean(),
  },
);
