import { tool } from "ai";
import { z } from "zod";
import { searchEntitiesToolDefinition } from "../schemas/search-entities.ts";
import type { CreateToolsOptions } from "#/options.ts";

export const searchEntitiesTool = {
  ...searchEntitiesToolDefinition,
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
