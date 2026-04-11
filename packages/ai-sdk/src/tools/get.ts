import type { Tool } from "ai";
import { tool } from "ai";
import type { World, WorldsGetInput, WorldsInterface } from "@wazoo/worlds-sdk";
import {
  worldSchema as worldsGetOutputSchema,
  worldsGetInputSchema,
} from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * get retrieves detailed metadata for a specific world.
 */
export async function get(
  worlds: WorldsInterface,
  input: WorldsGetInput,
): Promise<World> {
  const world = await worlds.get(input);
  if (!world) {
    throw new Error("World not found");
  }
  return world;
}

/**
 * WorldsGetTool is a tool for retrieving world metadata.
 */
export type WorldsGetTool = Tool<WorldsGetInput, World>;

/**
 * worldsGetTool defines the configuration for the world retrieval tool.
 */
export const worldsGetTool: WorldsTool<WorldsGetInput, World> = {
  name: "worlds_get",
  description:
    "Retrieves detailed metadata for a specific world. Use this tool when you have a slug and need to check its configuration, labels, or creation date. Input must be a 'slug'. Returns a world metadata object.",
  inputSchema: worldsGetInputSchema,
  outputSchema: worldsGetOutputSchema,
  isWrite: false,
};

/**
 * createWorldsGetTool instantiates the world retrieval tool.
 */
export function createWorldsGetTool(
  { worlds }: CreateToolsOptions,
): WorldsGetTool {
  return tool({
    ...worldsGetTool,
    execute: async (input) => {
      return await get(worlds, input);
    },
  });
}

