import { tool } from "ai";
import type { Tool } from "ai";
import type {
  SearchWorldsRequest,
  SearchWorldsResponse,
  WorldsDataPlane,
} from "@wazoo/worlds-sdk";
import { SearchWorldsRequestSchema } from "#/utils/validation.ts";
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
    "Performs a semantic search across one or more worlds.",
  inputSchema: SearchWorldsRequestSchema,
  outputSchema: z.any(),
  isWrite: false,
};

export function createWorldsSearchTool(
  { data }: CreateToolsOptions,
): WorldsSearchTool {
  return tool({
    ...worldsSearchTool,
    execute: async (input: SearchWorldsRequest) => {
      return await data.search(input);
    },
  });
}

/**
 * WorldsSearchTool is a tool for searching worlds.
 */
export type WorldsSearchTool = Tool<
  SearchWorldsRequest,
  SearchWorldsResponse
>;

/**
 * worldsSearchTool defines the configuration for the world search tool.
 */
export const worldsSearchTool: WorldsTool<
  SearchWorldsRequest,
  SearchWorldsResponse
> = {
  name: "worlds_search",
  description:
    "Performs a semantic search across one or more worlds. Use this tool when you need to find information based on its meaning or context. Returns an array of match results with similarity scores.",
  inputSchema: SearchWorldsRequestSchema,
  outputSchema: z.object({
    results: z.array(SearchWorldsResultSchema),
    nextPageToken: z.string().optional(),
  }),
  isWrite: false,
};

/**
 * createWorldsSearchTool instantiates the world search tool.
 */
export function createWorldsSearchTool(
  { data }: CreateToolsOptions,
): WorldsSearchTool {
  return tool({
    ...worldsSearchTool,
    execute: async (input: SearchWorldsRequest) => {
      return await search(data, input);
    },
  });
}
