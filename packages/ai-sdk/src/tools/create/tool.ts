import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  type WorldsCreateInput,
  worldsCreateInputSchema,
  worldsCreateOutputSchema,
} from "#/tools/create/schema.ts";

import type { World } from "@wazoo/worlds-sdk";

/** create creates a new isolated world. */
export async function create(
  worlds: CreateToolsOptions["worlds"],
  input: WorldsCreateInput,
): Promise<World> {
  return await worlds.create(input);
}

/** WorldsCreateTool is a tool for creating a new world. */
export type WorldsCreateTool = Tool<WorldsCreateInput, World>;

/** worldsCreateTool defines the configuration for the world creation tool. */
export const worldsCreateTool = {
  name: "worlds_create",
  description:
    "Creates a new isolated knowledge graph (world). Use this tool when the user wants to start a fresh dataset or project space. Input must include a unique 'slug' and a human-readable 'label'. Returns the newly created world object.",
  inputSchema: worldsCreateInputSchema,
  outputSchema: worldsCreateOutputSchema,
};

/** createWorldsCreateTool instantiates the world creation tool. */
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
