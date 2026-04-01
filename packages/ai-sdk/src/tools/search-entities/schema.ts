import { z } from "zod";

import { tripleSearchResultSchema } from "@wazoo/worlds-sdk";
import type { TripleSearchResult } from "@wazoo/worlds-sdk";

export interface SearchEntitiesInput {
  world: string;
  query: string;
  types?: string[];
  subjects?: string[];
  predicates?: string[];
  limit?: number;
}

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

export interface SearchEntitiesOutput {
  results: TripleSearchResult[];
}

export const searchEntitiesOutputSchema: z.ZodType<SearchEntitiesOutput> = z
  .object({
    results: z.array(tripleSearchResultSchema),
  });
