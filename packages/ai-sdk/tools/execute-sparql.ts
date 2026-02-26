import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import {
  type ExecuteSparqlOutput,
  executeSparqlOutputSchema,
  isSparqlUpdate,
  type Source,
} from "@wazoo/worlds-sdk";
import type { CreateToolsOptions } from "#/options.ts";

// Re-export the output schema and type from the SDK.
export { type ExecuteSparqlOutput, executeSparqlOutputSchema };

/**
 * ExecuteSparqlInput is the input to the executeSparql tool.
 */
export interface ExecuteSparqlInput {
  source: string;
  sparql: string;
}

/**
 * executeSparqlInputSchema is the input schema for the executeSparql tool.
 */
export const executeSparqlInputSchema: z.ZodType<ExecuteSparqlInput> = z.object(
  {
    source: z.string().describe(
      "The ID of the source to execute the query against.",
    ),
    sparql: z.string().describe("The SPARQL query or update to execute."),
  },
);

/**
 * ExecuteSparqlTool is a tool that executes SPARQL queries and updates.
 */
export type ExecuteSparqlTool = Tool<ExecuteSparqlInput, ExecuteSparqlOutput>;

/**
 * createExecuteSparqlTool creates a tool that executes SPARQL queries and updates.
 */
export function createExecuteSparqlTool(
  { sdk, sources }: CreateToolsOptions,
): ExecuteSparqlTool {
  return tool({
    description:
      "Execute SPARQL queries and updates against a specific world knowledge base.",
    inputSchema: executeSparqlInputSchema,
    outputSchema: executeSparqlOutputSchema,
    execute: async (input: ExecuteSparqlInput) => {
      const { sparql, source } = input;
      if (
        isSparqlUpdate(sparql) &&
        !(sources.find((s: Source) => s.id === source)?.write ??
          false)
      ) {
        throw new Error(
          "Write operations are disabled. This source is configured as read-only. " +
            "Only SELECT, ASK, CONSTRUCT, and DESCRIBE queries are allowed.",
        );
      }

      return await sdk.worlds.sparql(source, sparql);
    },
  });
}
