import type { Tool } from "ai";
import { tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import type { WorldsImportInput, WorldsImportOutput } from "./schema.ts";
import { worldsImportInputSchema, worldsImportOutputSchema } from "./schema.ts";

/** importData ingests RDF data into a world. */
export async function importData(
  worlds: CreateToolsOptions["worlds"],
  input: WorldsImportInput,
): Promise<WorldsImportOutput> {
  await worlds.import(input);
  return { success: true };
}

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
      return await importData(worlds, input);
    },
  });
}
