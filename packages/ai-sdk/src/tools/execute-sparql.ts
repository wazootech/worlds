import { tool } from "ai";
import { z } from "zod";
import {
  executeSparqlOutputSchema,
  isSparqlUpdate,
  toolDescriptions,
  worldsQuerySchema,
} from "@wazoo/worlds-sdk";
import type { Tool } from "ai";
import type { ExecuteSparqlOutput } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions } from "#/options.ts";

/**
 * ExecuteSparqlInput is the input to the executeSparql tool.
 */
export type ExecuteSparqlInput = z.infer<typeof worldsQuerySchema>;

/**
 * ExecuteSparqlTool is a tool that executes SPARQL queries and updates.
 */
export type ExecuteSparqlTool = Tool<ExecuteSparqlInput, ExecuteSparqlOutput>;

/**
 * createExecuteSparqlTool creates a tool that executes SPARQL queries and updates.
 */
export function createExecuteSparqlTool(
  { worlds, sources }: CreateToolsOptions,
): ExecuteSparqlTool {
  return tool({
    description: toolDescriptions.worldsQuery,
    inputSchema: worldsQuerySchema,
    outputSchema: executeSparqlOutputSchema,
    execute: async (input: ExecuteSparqlInput) => {
      const { query, world: source } = input;
      const s = sources.find((s) =>
        (typeof s === "string" ? s : s.world) === source
      );
      const isWritable = typeof s === "object" ? s.write : false;

      if (isSparqlUpdate(query) && !isWritable) {
        throw new Error(
          "Write operations are disabled. This source is configured as read-only. " +
            "Only SELECT, ASK, CONSTRUCT, and DESCRIBE queries are allowed.",
        );
      }

      return await worlds.sparql(source, query);
    },
  });
}

// Re-export the output schema and type.
export { type ExecuteSparqlOutput, executeSparqlOutputSchema };
