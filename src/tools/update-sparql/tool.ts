import { tool } from "ai";
import { z } from "zod";

export interface SparqlEngine {
  executeSparql(query: string): Promise<unknown>;
}

/**
 * createUpdateSparqlTool creates a tool that executes modification SPARQL queries.
 */
export function createUpdateSparqlTool(sparqlEngine: SparqlEngine) {
  return tool({
    description:
      `Execute a MODIFICATION SPARQL query against the knowledge base.
Use this tool to:
- Insert new facts (INSERT DATA, INSERT {})
- Delete obsolete facts (DELETE DATA, DELETE {})
- Update information
- Supports: INSERT, DELETE, LOAD, CLEAR`,
    inputSchema: z.object({
      query: z.string().describe("The SPARQL update query to execute."),
    }),
    execute: async ({ query }) => {
      return await sparqlEngine.executeSparql(query);
    },
  });
}
