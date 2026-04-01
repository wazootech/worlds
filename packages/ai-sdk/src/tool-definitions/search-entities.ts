import { tool } from "ai";
import { z } from "zod";
import {
  worldsSearchSchema,
  worldsSearchOutputSchema,
} from "../schemas/tools.ts";
import type { CreateToolsOptions } from "#/options.ts";

export const searchEntitiesTool = {
  name: "worlds_search",
  description: "Search for facts in a Worlds knowledge graph using semantic search",
  inputSchema: worldsSearchSchema,
  outputSchema: worldsSearchOutputSchema,
};

export function createSearchEntitiesTool(
  { worlds }: CreateToolsOptions,
) {
  return tool({
    ...searchEntitiesTool,
    execute: async (input) => {
      const { world, query, types, limit = 20 } = input;
      const results = await worlds.search(world, query, {
        limit,
        types,
      });

      return { results };
    },
  });
}
