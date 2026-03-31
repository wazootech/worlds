import { tool } from "ai";
import { z } from "zod";
import {
  toolDescriptions,
  worldsSearchOutputSchema,
  worldsSearchSchema,
} from "../schemas/tools.ts";
import type { Tool } from "ai";
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
    description: toolDescriptions.worldsSearch,
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
