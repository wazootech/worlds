import type { Tool } from "ai";
import { tool } from "ai";
import type {
  World,
  WorldsCreateInput,
  WorldsInterface,
} from "@wazoo/worlds-sdk";
import {
  worldSchema as worldsCreateOutputSchema,
  worldsCreateInputSchema,
} from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * create creates a new isolated world.
 */
export async function create(
  worlds: WorldsInterface,
  input: WorldsCreateInput,
): Promise<World> {
  return await worlds.create(input);
}

/**
 * WorldsCreateTool is a tool for creating a new world.
 */
export type WorldsCreateTool = Tool<WorldsCreateInput, World>;

/**
 * worldsCreateTool defines the configuration for the world creation tool.
 */
export const worldsCreateTool: WorldsTool<
  WorldsCreateInput,
  World
> = {
  name: "worlds_create",
  description:
    "Creates a new isolated knowledge graph (world). Use this tool when the user wants to start a fresh dataset or project space. Input must include a unique 'world' and a human-readable 'label'. Returns the newly created world object.",
  inputSchema: worldsCreateInputSchema,
  outputSchema: worldsCreateOutputSchema,
  isWrite: true,
};

/**
 * createWorldsCreateTool instantiates the world creation tool.
 */
export function createWorldsCreateTool(
  { worlds }: CreateToolsOptions,
): WorldsCreateTool {
  return tool({
    ...worldsCreateTool,
    execute: async (input) => {
      return await create(worlds, input);
    },
  });
}
