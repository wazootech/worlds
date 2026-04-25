import { tool } from "ai";
import type { Tool } from "ai";
import {
  isSparqlUpdate,
  resolveSource,
  type SparqlQueryRequest,
  type SparqlQueryResponse,
} from "@wazoo/worlds-sdk";
import { zSparqlQueryRequest } from "@wazoo/worlds-spec/zod";
import type { CreateToolsOptions, SourceInput, WorldsTool } from "#/types.ts";
import { z } from "zod";

export type WorldsSparqlTool = Tool<
  SparqlQueryRequest,
  SparqlQueryResponse
>;

export const worldsSparqlTool: WorldsTool<
  SparqlQueryRequest,
  SparqlQueryResponse
> = {
  name: "worlds_sparql",
  description:
    "Executes a SPARQL query or update against the RDF data stored in one or more worlds.",
  inputSchema: zSparqlQueryRequest,
  outputSchema: z.any(),
  isWrite: true,
};

export function createWorldsSparqlTool(
  { worlds }: CreateToolsOptions,
): WorldsSparqlTool {
  return tool({
    ...worldsSparqlTool,
    execute: async (input: SparqlQueryRequest) => {
      const isUpdate = isSparqlUpdate(input.query);

      if (isUpdate) {
        const sourceArr = input.sources || [input.parent || "_"];
        for (const s of sourceArr) {
          const resolved = resolveSource(s as SourceInput);
          if (resolved.mode !== "write") {
            throw new Error(
              `Permission denied: Source ${JSON.stringify(s)} is not writable`,
            );
          }
        }
      }

      return await worlds.sparql(input);
    },
  });
}
