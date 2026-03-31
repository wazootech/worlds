import { tool } from "ai";
import { z } from "zod";
import {
  tripleSearchResultSchema,
  worldsSearchSchema,
  worldsSearchOutputSchema,
} from "@wazoo/worlds-sdk";
import type { Tool } from "ai";
import type { TripleSearchResult } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions } from "#/options.ts";

export type SearchEntitiesInput = z.infer<typeof worldsSearchSchema>;
export type SearchEntitiesOutput = z.infer<typeof worldsSearchOutputSchema>;

/**
 * SearchEntitiesTool is a tool that resolves entities by searching for facts.
 */
export type SearchEntitiesTool = Tool<
  SearchEntitiesInput,
  SearchEntitiesOutput
>;

/**
 * createSearchEntitiesTool creates a tool that resolves entities by searching for facts.
 */
export function createSearchEntitiesTool(
  { worlds }: CreateToolsOptions,
): SearchEntitiesTool {
  return tool({
    description:
      "Search for entities in the knowledge base. Returns a list of candidates to help resolve ambiguities.",
    inputSchema: worldsSearchSchema,
    outputSchema: worldsSearchOutputSchema,
    execute: async (input: SearchEntitiesInput) => {
      const { world, query, types, limit = 20 } = input;
      const results = await worlds.search(world, query, {
        limit,
        types,
      });

      return { results };
    },
  });
}
