import { tool } from "ai";
import type { Tool } from "ai";
import type { GetWorldRequest, World } from "@wazoo/worlds-sdk";
import { zGetWorldRequest } from "@wazoo/worlds-spec/zod";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

export type WorldsGetWorldTool = Tool<GetWorldRequest, World | null>;

export const worldsGetWorldTool: WorldsTool<GetWorldRequest, World | null> = {
  name: "worlds_get_world",
  description:
    "Retrieves metadata for a single dataset (world) by its identifier or name.",
  inputSchema: zGetWorldRequest,
  outputSchema: z.any(),
  isWrite: false,
};

export function createWorldsGetWorldTool(
  { worlds }: CreateToolsOptions,
): WorldsGetWorldTool {
  return tool({
    ...worldsGetWorldTool,
    execute: async (input: GetWorldRequest) => {
      return await worlds.getWorld(input);
    },
  });
}
