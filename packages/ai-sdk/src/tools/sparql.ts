import { tool } from "ai";
import type { Tool } from "ai";
import {
  isSparqlUpdate,
  resolveSource,
  type SparqlQueryRequest,
  type SparqlQueryResponse,
  type WorldsData,
} from "@wazoo/worlds-sdk";
import { SparqlQueryRequestSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

/**
 * sparql executes a SPARQL query against one or more worlds.
 */
export async function sparql(
  data: WorldsData,
  _sources: unknown[],
  input: SparqlQueryRequest,
): Promise<SparqlQueryResponse> {
  const isUpdate = isSparqlUpdate(input.query);

  if (isUpdate) {
    const sourceArr = input.sources || [input.parent || "_"];
    for (const s of sourceArr) {
      const resolved = resolveSource(s);
      if (resolved.mode !== "write") {
        throw new Error(
          `Permission denied: Source ${JSON.stringify(s)} is not writable`,
        );
      }
    }
  }

  return await data.querySparql(input);
}

/**
 * WorldsSparqlTool is a tool for executing SPARQL queries.
 */
export type WorldsSparqlTool = Tool<
  SparqlQueryRequest,
  SparqlQueryResponse
>;

/**
 * worldsSparqlTool defines the configuration for the SPARQL tool.
 */
export const worldsSparqlTool: WorldsTool<
  SparqlQueryRequest,
  SparqlQueryResponse
> = {
  name: "worlds_sparql",
  description:
    "Executes a SPARQL query or update against the RDF data stored in one or more worlds. Use this tool for precise graph-based queries, pattern matching, or to perform granular data updates. Supports SELECT, ASK, CONSTRUCT, and UPDATE operations.",
  inputSchema: SparqlQueryRequestSchema,
  outputSchema: z.any(), // SPARQL result structure is complex and varied
  isWrite: true,
};

/**
 * createWorldsSparqlTool instantiates the SPARQL tool.
 */
export function createWorldsSparqlTool(
  { worlds, sources }: CreateToolsOptions,
): WorldsSparqlTool {
  return tool({
    ...worldsSparqlTool,
    execute: async (input: SparqlQueryRequest) => {
      return await sparql(worlds, sources, input);
    },
  });
}
