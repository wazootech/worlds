import { tool } from "ai";
import type { Tool } from "ai";
import type {
  UpdateWorldRequest,
  World,
  WorldsEngine,
} from "@wazoo/worlds-sdk";
import { UpdateWorldRequestSchema, WorldSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * update modifies an existing world's metadata.
 */
export async function update(
  worlds: WorldsEngine,
  input: UpdateWorldRequest,
): Promise<World> {
  return await worlds.update(input);
}

/**
 * WorldsUpdateTool is a tool for updating a world.
 */
export type WorldsUpdateTool = Tool<UpdateWorldRequest, World>;

/**
 * worldsUpdateTool defines the configuration for the world update tool.
 */
export const worldsUpdateTool: WorldsTool<UpdateWorldRequest, World> = {
  name: "worlds_update",
  description:
    "Modifies metadata for an existing dataset (world), such as its display name or description. Use this tool when a user wants to rename a world or update its documentation.",
  inputSchema: UpdateWorldRequestSchema,
  outputSchema: WorldSchema,
  isWrite: true,
};

/**
 * createWorldsUpdateTool instantiates the world update tool.
 */
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
