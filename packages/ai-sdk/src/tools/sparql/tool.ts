import { tool } from "ai";
import type { Tool } from "ai";
import { isSparqlUpdate } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions } from "#/options.ts";
import {
  type ExecuteSparqlInput,
  executeSparqlInputSchema,
  type ExecuteSparqlOutput,
  executeSparqlOutputSchema,
} from "#/tools/sparql/schema.ts";

/** executeSparql executes a SPARQL query or update against a specific world. */
export async function executeSparql(
  worlds: CreateToolsOptions["worlds"],
  sources: CreateToolsOptions["sources"],
  input: ExecuteSparqlInput,
): Promise<ExecuteSparqlOutput> {
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
}

/** ExecuteSparqlTool is a tool for executing SPARQL queries and updates. */
export type ExecuteSparqlTool = Tool<ExecuteSparqlInput, ExecuteSparqlOutput>;

/** executeSparqlTool defines the configuration for the SPARQL execution tool. */
export const executeSparqlTool = {
  name: "worlds_query",
  description:
    "Executes a SPARQL query or update against a specific world. Use this tool when you need to retrieve raw facts, perform complex joins, or modify the knowledge graph via SPARQL. Input must be a 'world' ID and a 'query' string. Returns a JSON result object with bindings for SELECT/ASK or a boolean for updates.",
  inputSchema: executeSparqlInputSchema,
  outputSchema: executeSparqlOutputSchema,
};

/** createExecuteSparqlTool instantiates the SPARQL execution tool. */
export function createExecuteSparqlTool(
  { worlds, sources }: CreateToolsOptions,
): ExecuteSparqlTool {
  return tool({
    ...executeSparqlTool,
    execute: async (input) => {
      return await executeSparql(worlds, sources, input);
    },
  });
}
