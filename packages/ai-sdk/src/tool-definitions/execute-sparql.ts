import { tool } from "ai";
import { z } from "zod";
import { executeSparqlToolDefinition, worldsQuerySchema } from "../schemas/execute-sparql.ts";
import { executeSparqlOutputSchema, isSparqlUpdate } from "@wazoo/worlds-sdk";
import type { ExecuteSparqlOutput } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions } from "#/options.ts";

export const executeSparqlTool = {
  ...executeSparqlToolDefinition,
  outputSchema: executeSparqlOutputSchema,
};

export function createExecuteSparqlTool(
  { worlds, sources }: CreateToolsOptions,
) {
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
