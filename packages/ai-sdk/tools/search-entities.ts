import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import {
  type TripleSearchResult,
  tripleSearchResultSchema,
} from "@wazoo/worlds-sdk";
import type { CreateToolsOptions } from "#/options.ts";

/**
 * SearchEntitiesInput is the input to the searchEntities tool.
 */
export interface SearchEntitiesInput {
  source: string;
  query: string;
  types?: string[];
  limit?: number;
}

/**
 * searchEntitiesInputSchema is the input schema for the searchEntities tool.
 */
export const searchEntitiesInputSchema: z.ZodType<SearchEntitiesInput> = z
  .object({
    source: z.string().describe(
      "The ID of the source to search within.",
    ),
    query: z.string().describe(
      "The text of the associated entity as mentioned in the given text.",
    ),
    types: z.array(z.string()).optional().describe(
      "Optional IRIs of the entity types to filter by.",
    ),
    limit: z.number().min(1).max(100).optional().describe(
      "Maximum number of entities to return (default: 10).",
    ),
  });

/**
 * SearchEntitiesOutput is the output of the searchEntities tool.
 */
export interface SearchEntitiesOutput {
  results: TripleSearchResult[];
}

/**
 * searchEntitiesOutputSchema is the output schema for the searchEntities tool.
 */
export const searchEntitiesOutputSchema: z.ZodType<SearchEntitiesOutput> = z
  .object({
    results: z.array(tripleSearchResultSchema).describe(
      "A list of potential entity matches.",
    ),
  });

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
  { sdk }: CreateToolsOptions,
): SearchEntitiesTool {
  return tool({
    description:
      "Search for entities in the knowledge base. Returns a list of candidates to help resolve ambiguities.",
    inputSchema: searchEntitiesInputSchema,
    outputSchema: searchEntitiesOutputSchema,
    execute: async (input: SearchEntitiesInput) => {
      const { source, query, types, limit = 10 } = input;
      const results = await sdk.worlds.search(source, query, {
        limit,
        types,
      });

      return { results };
    },
  });
}
