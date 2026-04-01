import { tool } from "ai";
import type { Tool } from "ai";
import { isSparqlUpdate } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions } from "../../options.ts";
import {
  type ExecuteSparqlInput,
  executeSparqlInputSchema,
  type ExecuteSparqlOutput,
  executeSparqlOutputSchema,
} from "./schema.ts";

export type ExecuteSparqlTool = Tool<ExecuteSparqlInput, ExecuteSparqlOutput>;

export const executeSparqlTool = {
  name: "worlds_query",
  description:
    "Executes a SPARQL query or update against a specific world. Use this tool when you need to retrieve raw facts, perform complex joins, or modify the knowledge graph via SPARQL. Input must be a 'world' ID and a 'query' string. Returns a JSON result object with bindings for SELECT/ASK or a boolean for updates.",
  inputSchema: executeSparqlInputSchema,
  outputSchema: executeSparqlOutputSchema,
};

export function createExecuteSparqlTool(
  { worlds, sources }: CreateToolsOptions,
): ExecuteSparqlTool {
  return tool({
    ...executeSparqlTool,
    execute: async (input) => {
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
