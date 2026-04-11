import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type { WorldsDeleteInput, WorldsInterface } from "@wazoo/worlds-sdk";
import { worldsDeleteInputSchema } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * WorldsDeleteOutput is the output for deleting a world.
 */
export interface WorldsDeleteOutput {
  success: boolean;
}

/**
 * worldsDeleteOutputSchema is the Zod schema for world deletion output.
 */
export const worldsDeleteOutputSchema: z.ZodType<WorldsDeleteOutput> = z.object(
  {
    success: z.boolean(),
  },
);

/**
 * deleteWorld permanently deletes a world and all its data.
 */
export async function deleteWorld(
  worlds: WorldsInterface,
  input: WorldsDeleteInput,
): Promise<WorldsDeleteOutput> {
  await worlds.delete(input);
  return { success: true };
}

/**
 * WorldsDeleteTool is a tool for deleting a world.
 */
export type WorldsDeleteTool = Tool<WorldsDeleteInput, WorldsDeleteOutput>;

/**
 * worldsDeleteTool defines the configuration for the world deletion tool.
 */
export const worldsDeleteTool: WorldsTool<
  WorldsDeleteInput,
  WorldsDeleteOutput
> = {
  name: "worlds_delete",
  description:
    "Permanently deletes a world and all its associated data. This action is irreversible. Use this tool only when you are certain the world and its data are no longer needed. Input must be a 'slug'. Returns a success indicator.",
  inputSchema: worldsDeleteInputSchema,
  outputSchema: worldsDeleteOutputSchema,
  isWrite: true,
};

/**
 * createWorldsDeleteTool instantiates the world deletion tool.
 */
export function createWorldsDeleteTool(
  { worlds }: CreateToolsOptions,
): WorldsDeleteTool {
  return tool({
    ...worldsDeleteTool,
    execute: async (input) => {
      return await deleteWorld(worlds, input);
    },
  });
}
