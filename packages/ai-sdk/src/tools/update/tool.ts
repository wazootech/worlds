import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type { WorldsInterface, WorldsUpdateInput } from "@wazoo/worlds-sdk";
import { worldsUpdateInputSchema } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

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

/** update updates a world's metadata. */
export async function update(
  worlds: WorldsInterface,
  input: WorldsUpdateInput,
): Promise<WorldsUpdateOutput> {
  await worlds.update(input);
  return { success: true };
}

/** WorldsUpdateTool is a tool for updating a world. */
export type WorldsUpdateTool = Tool<WorldsUpdateInput, WorldsUpdateOutput>;

/** worldsUpdateTool defines the configuration for the world update tool. */
export const worldsUpdateTool: WorldsTool<
  WorldsUpdateInput,
  WorldsUpdateOutput
> = {
  name: "worlds_update",
  description:
    "Updates an existing world's metadata, such as its label or slug. Input must include the 'world' ID and at least one field to change. Returns a success indicator.",
  inputSchema: worldsUpdateInputSchema,
  outputSchema: worldsUpdateOutputSchema,
  isWrite: true,
};

/** createWorldsUpdateTool instantiates the world update tool. */
export function createWorldsUpdateTool(
  { worlds }: CreateToolsOptions,
): WorldsUpdateTool {
  return tool({
    ...worldsUpdateTool,
    execute: async (input) => {
      return await update(worlds, input);
    },
  });
}
