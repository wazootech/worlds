import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "../../options.ts";
import {
  type WorldsCreateInput,
  worldsCreateInputSchema,
  worldsCreateOutputSchema,
} from "./schema.ts";
import type { World } from "@wazoo/worlds-sdk";

export type WorldsCreateTool = Tool<WorldsCreateInput, World>;

export const worldsCreateTool = {
  name: "worlds_create",
  description:
    "Creates a new isolated knowledge graph (world). Use this tool when the user wants to start a fresh dataset or project space. Input must include a unique 'slug' and a human-readable 'label'. Returns the newly created world object.",
  inputSchema: worldsCreateInputSchema,
  outputSchema: worldsCreateOutputSchema,
};

export function createWorldsCreateTool(
  { worlds }: CreateToolsOptions,
): WorldsCreateTool {
  return tool({
    ...worldsCreateTool,
    execute: async (input) => {
      return await worlds.create(input);
    },
  });
}
