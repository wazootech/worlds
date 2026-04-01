import { z } from "zod";
import type { TripleSearchResult } from "@wazoo/worlds-sdk";
import { tripleSearchResultSchema } from "@wazoo/worlds-sdk";

/** SearchEntitiesInput is the input for searching entities. */
export interface SearchEntitiesInput {
  world: string;
  query: string;
  types?: string[];
  subjects?: string[];
  predicates?: string[];
  limit?: number;
}

/** searchEntitiesInputSchema is the Zod schema for entity search input. */
export const searchEntitiesInputSchema: z.ZodType<SearchEntitiesInput> = z
  .object({
    world: z.string().describe("The world ID to search within"),
    query: z.string().describe("The search query"),
    types: z.array(z.string()).optional().describe(
      "Optional RDF types to filter by",
    ),
    subjects: z.array(z.string()).optional().describe(
      "Optional subjects to filter by",
    ),
    predicates: z.array(z.string()).optional().describe(
      "Optional predicates to filter by",
    ),
    limit: z.number().min(1).max(100).default(20).describe(
      "Maximum number of results",
    ),
  });

/** SearchEntitiesOutput is the output for searching entities. */
export interface SearchEntitiesOutput {
  results: TripleSearchResult[];
}

/** searchEntitiesOutputSchema is the Zod schema for entity search output. */
export const searchEntitiesOutputSchema: z.ZodType<SearchEntitiesOutput> = z
  .object({
    results: z.array(tripleSearchResultSchema),
  });
