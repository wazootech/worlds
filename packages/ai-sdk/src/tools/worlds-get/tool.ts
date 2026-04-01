import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "../../options.ts";
import {
  type WorldsGetInput,
  worldsGetInputSchema,
  worldsGetOutputSchema,
} from "./schema.ts";
import type { World } from "@wazoo/worlds-sdk";

export type WorldsGetTool = Tool<WorldsGetInput, World>;

export const worldsGetTool = {
  name: "worlds_get",
  description:
    "Retrieves detailed metadata for a specific world. Use this tool when you have a world ID and need to check its configuration, labels, or creation date. Input must be a 'world' ID. Returns a world metadata object.",
  inputSchema: worldsGetInputSchema,
  outputSchema: worldsGetOutputSchema,
};

export function createWorldsGetTool(
  { worlds }: CreateToolsOptions,
): WorldsGetTool {
  return tool({
    ...worldsGetTool,
    execute: async (input) => {
      const world = await worlds.get(input.world);
      if (!world) {
        throw new Error("World not found");
      }
      return world;
    },
  });
}
