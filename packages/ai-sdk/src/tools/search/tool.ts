import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  type SearchEntitiesInput,
  searchEntitiesInputSchema,
  type SearchEntitiesOutput,
  searchEntitiesOutputSchema,
} from "#/tools/search/schema.ts";

/** searchEntities performs a semantic or text search for entities within a world. */
export async function searchEntities(
  worlds: CreateToolsOptions["worlds"],
  input: SearchEntitiesInput,
): Promise<SearchEntitiesOutput> {
  const { world, query, types, limit = 20 } = input;
  const results = await worlds.search(world, query, { limit, types });
  return { results };
}

/** SearchEntitiesTool is a tool for searching entities within a world. */
export type SearchEntitiesTool = Tool<
  SearchEntitiesInput,
  SearchEntitiesOutput
>;

/** searchEntitiesTool defines the configuration for the entity search tool. */
export const searchEntitiesTool = {
  name: "search_entities",
  description:
    "Performs semantic or text search for entities and facts within a specific world. Use this tool when a user asks about an entity by a natural language name or needs to find related information by proximity. Input must be a 'world' ID and a 'query' string. Returns an array of search results including IRIs and relevance scores.",
  inputSchema: searchEntitiesInputSchema,
  outputSchema: searchEntitiesOutputSchema,
};

/** createSearchEntitiesTool instantiates the entity search tool. */
export function createSearchEntitiesTool(
  { worlds }: CreateToolsOptions,
): SearchEntitiesTool {
  return tool({
    ...searchEntitiesTool,
    execute: async (input) => {
      return await searchEntities(worlds, input);
    },
  });
}
