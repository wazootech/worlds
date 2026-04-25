import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateWorldRequest, World } from "@wazoo/worlds-sdk";
import { zCreateWorldRequest, zWorld } from "@wazoo/worlds-spec/zod";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

export type WorldsCreateWorldTool = Tool<CreateWorldRequest, World>;

export const worldsCreateWorldTool: WorldsTool<CreateWorldRequest, World> = {
  name: "worlds_create_world",
  description:
    "Initializes a new dataset (world) with a provided display name and optional description.",
  inputSchema: zCreateWorldRequest,
  outputSchema: zWorld,
  isWrite: true,
};

export function createWorldsCreateWorldTool(
  { worlds }: CreateToolsOptions,
): WorldsCreateWorldTool {
  return tool({
    ...worldsCreateWorldTool,
    execute: async (input: CreateWorldRequest) => {
      return await worlds.createWorld(input);
    },
  });
}
