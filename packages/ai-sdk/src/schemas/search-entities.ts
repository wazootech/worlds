import { z } from "zod";

export interface WorldsSearchInput {
  world: string;
  query: string;
  types?: string[];
  subjects?: string[];
  predicates?: string[];
  limit?: number;
}

export const worldsSearchSchema: z.ZodType<WorldsSearchInput> = z.object({
  world: z.string().describe("The world ID to search within"),
  query: z.string().describe("The search query"),
  types: z.array(z.string()).optional().describe("Optional RDF types to filter by"),
  subjects: z.array(z.string()).optional().describe("Optional subjects to filter by"),
  predicates: z.array(z.string()).optional().describe("Optional predicates to filter by"),
  limit: z.number().min(1).max(100).default(20).describe("Maximum number of results"),
});

export const searchEntitiesToolDefinition = {
  name: "worlds_search",
  description: "Search for facts in a Worlds knowledge graph using semantic search",
  inputSchema: worldsSearchSchema,
} as const;
