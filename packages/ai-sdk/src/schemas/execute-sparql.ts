import { z } from "zod";

export interface WorldsQueryInput {
  world: string;
  query: string;
}

export const worldsQuerySchema: z.ZodType<WorldsQueryInput> = z.object({
  world: z.string().describe("The world ID to query"),
  query: z.string().describe("SPARQL query string"),
});

export const executeSparqlToolDefinition = {
  name: "worlds_query",
  description: "Query a Worlds knowledge graph using SPARQL",
  inputSchema: worldsQuerySchema,
} as const;
