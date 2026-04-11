import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type {
  WorldsInterface,
  WorldsSearchInput,
  WorldsSearchOutput,
} from "@wazoo/worlds-sdk";
import {
  worldsSearchInputSchema,
  worldsSearchOutputSchema as engineWorldsSearchOutputSchema,
} from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * WorldsSearchOutputData is the wrapper for search results in the AI SDK.
 */
export interface WorldsSearchOutputData {
  results: WorldsSearchOutput[];
}

/**
 * worldsSearchOutputSchema is the Zod schema for search output.
 */
export const worldsSearchOutputSchema: z.ZodType<WorldsSearchOutputData> = z
  .object({
    results: z.array(engineWorldsSearchOutputSchema),
  });

/**
 * search performs a semantic or text search for entities within a world.
 */
export async function search(
  worlds: WorldsInterface,
  input: WorldsSearchInput,
): Promise<WorldsSearchOutputData> {
  const results = await worlds.search(input);
  return { results };
}

/**
 * WorldsSearchTool is a tool for searching entities within a world.
 */
export type WorldsSearchTool = Tool<
  WorldsSearchInput,
  WorldsSearchOutputData
>;

/**
 * worldsSearchTool defines the configuration for the entity search tool.
 */
export const worldsSearchTool: WorldsTool<
  WorldsSearchInput,
  WorldsSearchOutputData
> = {
  name: "worlds_search",
  description:
    "Performs semantic or text search for entities and facts within a specific world. Use this tool when a user asks about an entity by a natural language name or needs to find related information by proximity. Input must be a 'slug' and a 'query' string. Returns an array of search results including IRIs and relevance scores.",
  inputSchema: worldsSearchInputSchema,
  outputSchema: worldsSearchOutputSchema,
  isWrite: false,
};

/**
 * createWorldsSearchTool instantiates the entity search tool.
 */
export function createWorldsSearchTool(
  { worlds }: CreateToolsOptions,
): WorldsSearchTool {
  return tool({
    ...worldsSearchTool,
    execute: async (input) => {
      return await search(worlds, input);
    },
  });
}

