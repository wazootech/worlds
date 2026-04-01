import { z } from "zod";
import { type World, worldSchema } from "@wazoo/worlds-sdk";

export { worldsListInputSchema } from "@wazoo/worlds-sdk";
export type { WorldsListInput } from "@wazoo/worlds-sdk";

/** WorldsListOutput is the output for listing worlds. */
export interface WorldsListOutput {
  worlds: World[];
}

/** worldsListOutputSchema is the Zod schema for world listing output. */
export const worldsListOutputSchema: z.ZodType<WorldsListOutput> = z.object({
  worlds: z.array(worldSchema),
});
