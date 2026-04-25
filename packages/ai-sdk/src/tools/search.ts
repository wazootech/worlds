import { tool } from "ai";
import type { Tool } from "ai";
import type {
  SearchWorldsRequest,
  SearchWorldsResponse,
} from "@wazoo/worlds-sdk";
import { zSearchWorldsRequest } from "@wazoo/worlds-spec/zod";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

export type WorldsSearchTool = Tool<
  SearchWorldsRequest,
  SearchWorldsResponse
>;

export const worldsSearchTool: WorldsTool<
  SearchWorldsRequest,
  SearchWorldsResponse
> = {
  name: "worlds_search",
  description:
    "Performs a semantic search across one or more worlds. Use this tool when you need to find information based on its meaning or context. Returns an array of match results with similarity scores.",
  inputSchema: zSearchWorldsRequest,
  outputSchema: z.any(),
  isWrite: false,
};

export function createWorldsSearchTool(
  { worlds }: CreateToolsOptions,
): WorldsSearchTool {
  return tool({
    ...worldsSearchTool,
    execute: async (input: SearchWorldsRequest) => {
      return await worlds.search(input);
    },
  });
}
