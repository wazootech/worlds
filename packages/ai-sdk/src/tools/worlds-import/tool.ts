import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  type WorldsImportInput,
  worldsImportInputSchema,
  type WorldsImportOutput,
  worldsImportOutputSchema,
} from "#/tools/worlds-import/schema.ts";

/** WorldsImportTool is a tool for importing RDF data into a world. */
export type WorldsImportTool = Tool<WorldsImportInput, WorldsImportOutput>;

/** worldsImportTool defines the configuration for the world import tool. */
export const worldsImportTool = {
  name: "worlds_import",
  description:
    "Ingests RDF data into an existing world's graph. Use this tool when you have raw Turtle, N-Triples, or N-Quads data to upload. Input must be a 'world' ID and a 'data' string. Returns a success indicator.",
  inputSchema: worldsImportInputSchema,
  outputSchema: worldsImportOutputSchema,
};

/** createWorldsImportTool instantiates the world import tool. */
export function createWorldsImportTool(
  { worlds }: CreateToolsOptions,
): WorldsImportTool {
  return tool({
    ...worldsImportTool,
    execute: async (input) => {
      await worlds.import(input.world, input.data, {
        contentType: "application/n-triples",
      });
      return { success: true };
    },
  });
}
