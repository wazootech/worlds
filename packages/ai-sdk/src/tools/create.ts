import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateWorldRequest, World } from "@wazoo/worlds-sdk";
import { zCreateWorldRequest, zWorld } from "@wazoo/worlds-spec/zod";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

export type WorldsCreateTool = Tool<CreateWorldRequest, World>;

export const worldsCreateTool: WorldsTool<CreateWorldRequest, World> = {
  name: "worlds_create",
  description:
    "Initializes a new dataset (world) with a provided display name and optional description.",
  inputSchema: zCreateWorldRequest,
  outputSchema: zWorld,
  isWrite: true,
};

export function createWorldsCreateTool(
  { worlds }: CreateToolsOptions,
): WorldsCreateTool {
  return tool({
    ...worldsCreateTool,
    execute: async (input: CreateWorldRequest) => {
      return await worlds.createWorld(input);
    },
  });
}
