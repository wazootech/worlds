import type { Tool } from "ai";
import { tool } from "ai";
import type {
  WorldsInterface,
  WorldsSparqlInput,
  WorldsSparqlOutput,
} from "@wazoo/worlds-sdk";
import {
  isSparqlUpdate,
  resolveSource,
  worldsSparqlInputSchema,
  worldsSparqlOutputSchema,
} from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, SourceInput, WorldsTool } from "#/types.ts";

/**
 * sparql executes a SPARQL query or update against a specific world.
 */
export async function sparql(
  worlds: WorldsInterface,
  sources: SourceInput[],
  input: WorldsSparqlInput,
): Promise<WorldsSparqlOutput> {
  const { query, sources: inputSources } = input;
  const targetSources = inputSources ?? [];

  if (isSparqlUpdate(query)) {
    // For updates, ensure all targeted sources are writable
    for (const source of targetSources) {
      const { world } = resolveSource(source);

      const s = sources.find((src) => {
        const resolved = resolveSource(src);
        return resolved.world === world;
      });
      const isWritable = typeof s === "object" ? s.write : false;

      if (!isWritable) {
        throw new Error(
          `Write operations are disabled for source: ${world}. ` +
            "Only SELECT, ASK, CONSTRUCT, and DESCRIBE queries are allowed.",
        );
      }
    }
  }

  return await worlds.sparql(input);
}

/**
 * WorldsSparqlTool is a tool for executing SPARQL queries and updates.
 */
export type WorldsSparqlTool = Tool<WorldsSparqlInput, WorldsSparqlOutput>;

/**
 * worldsSparqlTool defines the configuration for the SPARQL execution tool.
 */
export const worldsSparqlTool: WorldsTool<
  WorldsSparqlInput,
  WorldsSparqlOutput
> = {
  name: "worlds_sparql",
  description:
    "Executes a SPARQL query or update against one or more worlds. Use this tool when you need to retrieve raw facts, perform complex joins, or modify the knowledge graph via SPARQL. Input must be an array of 'sources' and a 'query' string. Returns a JSON result object with bindings for SELECT/ASK or a boolean for updates.",
  inputSchema: worldsSparqlInputSchema,
  outputSchema: worldsSparqlOutputSchema,
  isWrite: true,
};

/**
 * createWorldsSparqlTool instantiates the SPARQL execution tool.
 */
export function createWorldsSparqlTool(
  { worlds, sources }: CreateToolsOptions,
): WorldsSparqlTool {
  return tool({
    ...worldsSparqlTool,
    execute: async (input) => {
      return await sparql(worlds, sources, input);
    },
  });
}
