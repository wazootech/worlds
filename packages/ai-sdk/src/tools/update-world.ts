import { tool } from "ai";
import type { Tool } from "ai";
import type { UpdateWorldRequest, World } from "@wazoo/worlds-sdk";
import { zUpdateWorldRequest, zWorld } from "@wazoo/worlds-spec/zod";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

export type WorldsUpdateWorldTool = Tool<UpdateWorldRequest, World>;

export const worldsUpdateWorldTool: WorldsTool<UpdateWorldRequest, World> = {
  name: "worlds_update_world",
  description:
    "Modifies metadata for an existing dataset (world), such as its display name or description.",
  inputSchema: zUpdateWorldRequest,
  outputSchema: zWorld,
  isWrite: true,
};

export function createWorldsUpdateWorldTool(
  { worlds }: CreateToolsOptions,
): WorldsUpdateWorldTool {
  return tool({
    ...worldsUpdateWorldTool,
    execute: async (input: UpdateWorldRequest) => {
      return await worlds.updateWorld(input);
    },
  });
}
