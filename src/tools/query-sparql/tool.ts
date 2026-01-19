import { tool } from "ai";
import { z } from "zod";

export interface SparqlEngine {
  executeSparql(query: string): Promise<unknown>;
}

/**
 * createQuerySparqlTool creates a tool that executes read-only SPARQL queries.
 */
export function createQuerySparqlTool(sparqlEngine: SparqlEngine) {
  return tool({
    description: `Execute a READ-ONLY SPARQL query against the knowledge base.
Use this tool to:
- Research existing data and schema structure
- Find existing entities before creating new ones
- Verify if facts already exist
- Supports: SELECT, ASK, CONSTRUCT, DESCRIBE`,
    inputSchema: z.object({
      query: z.string().describe("The SPARQL query to execute."),
    }),
    execute: async ({ query }) => {
      // In a more advanced implementation, you could enforce read-only logic here
      return await sparqlEngine.executeSparql(query);
    },
  });
}
