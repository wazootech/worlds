import type { Tool } from "ai";
import { tool } from "ai";
import type {
  CreateToolsOptions,
  WorldsInterface,
  WorldsTool,
} from "#/types.ts";
import type { WorldsSearchInput, WorldsSearchOutputData } from "./schema.ts";
import { worldsSearchInputSchema, worldsSearchOutputSchema } from "./schema.ts";

/** search performs a semantic or text search for entities within a world. */
export async function search(
  worlds: WorldsInterface,
  input: WorldsSearchInput,
): Promise<WorldsSearchOutputData> {
  const results = await worlds.search(input);
  return { results };
}

/** WorldsSearchTool is a tool for searching entities within a world. */
export type WorldsSearchTool = Tool<
  WorldsSearchInput,
  WorldsSearchOutputData
>;

/** worldsSearchTool defines the configuration for the entity search tool. */
export const worldsSearchTool: WorldsTool<
  WorldsSearchInput,
  WorldsSearchOutputData
> = {
  name: "worlds_search",
  description:
    "Performs semantic or text search for entities and facts within a specific world. Use this tool when a user asks about an entity by a natural language name or needs to find related information by proximity. Input must be a 'world' ID and a 'query' string. Returns an array of search results including IRIs and relevance scores.",
  inputSchema: worldsSearchInputSchema,
  outputSchema: worldsSearchOutputSchema,
  isWrite: false,
};

/** createWorldsSearchTool instantiates the entity search tool. */
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
