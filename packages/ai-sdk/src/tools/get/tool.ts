import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  type WorldsGetInput,
  worldsGetInputSchema,
  worldsGetOutputSchema,
} from "#/tools/get/schema.ts";

import type { World } from "@wazoo/worlds-sdk";

/** get retrieves detailed metadata for a specific world. */
export async function get(
  worlds: CreateToolsOptions["worlds"],
  input: WorldsGetInput,
): Promise<World> {
  const world = await worlds.get(input.world);
  if (!world) {
    throw new Error("World not found");
  }
  return world;
}

/** WorldsGetTool is a tool for retrieving world metadata. */
export type WorldsGetTool = Tool<WorldsGetInput, World>;

/** worldsGetTool defines the configuration for the world retrieval tool. */
export const worldsGetTool = {
  name: "worlds_get",
  description:
    "Retrieves detailed metadata for a specific world. Use this tool when you have a world ID and need to check its configuration, labels, or creation date. Input must be a 'world' ID. Returns a world metadata object.",
  inputSchema: worldsGetInputSchema,
  outputSchema: worldsGetOutputSchema,
};

/** createWorldsGetTool instantiates the world retrieval tool. */
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
