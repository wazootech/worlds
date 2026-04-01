import type { Tool } from "ai";
import { tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import type { WorldsDeleteInput, WorldsDeleteOutput } from "./schema.ts";
import { worldsDeleteInputSchema, worldsDeleteOutputSchema } from "./schema.ts";

/** deleteWorld permanently deletes a world and all its data. */
export async function deleteWorld(
  worlds: CreateToolsOptions["worlds"],
  input: WorldsDeleteInput,
): Promise<WorldsDeleteOutput> {
  await worlds.delete(input);
  return { success: true };
}

/** WorldsDeleteTool is a tool for deleting a world. */
export type WorldsDeleteTool = Tool<WorldsDeleteInput, WorldsDeleteOutput>;

/** worldsDeleteTool defines the configuration for the world deletion tool. */
export const worldsDeleteTool = {
  name: "worlds_delete",
  description:
    "Permanently deletes a world and all its associated data. This action is irreversible. Use this tool only when you are certain the world and its data are no longer needed. Input must be a 'world' ID. Returns a success indicator.",
  inputSchema: worldsDeleteInputSchema,
  outputSchema: worldsDeleteOutputSchema,
};

/** createWorldsDeleteTool instantiates the world deletion tool. */
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
