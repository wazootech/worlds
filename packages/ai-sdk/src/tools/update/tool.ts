import type { Tool } from "ai";
import { tool } from "ai";
import type { CreateToolsOptions, WorldsInterface } from "#/options.ts";
import type { WorldsUpdateInput, WorldsUpdateOutput } from "./schema.ts";
import { worldsUpdateInputSchema, worldsUpdateOutputSchema } from "./schema.ts";

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
export const worldsUpdateTool = {
  name: "worlds_update",
  description:
    "Updates an existing world's metadata, such as its label or slug. Input must include the 'world' ID and at least one field to change. Returns a success indicator.",
  inputSchema: worldsUpdateInputSchema,
  outputSchema: worldsUpdateOutputSchema,
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
