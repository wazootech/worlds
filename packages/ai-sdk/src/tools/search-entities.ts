import { tool } from "ai";
import { z } from "zod";
import { searchEntitiesTool } from "../tool-definitions/search-entities.ts";
import { worldsSearchSchema } from "../schemas/search-entities.ts";
import type { CreateToolsOptions } from "#/options.ts";

export type SearchEntitiesInput = z.infer<typeof searchEntitiesTool.inputSchema>;
export type SearchEntitiesOutput = z.infer<typeof worldsSearchSchema>;
export type SearchEntitiesTool = ReturnType<typeof createSearchEntitiesTool>;

export function createSearchEntitiesTool(
  { worlds }: CreateToolsOptions,
) {
  return tool({
    ...searchEntitiesTool,
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
