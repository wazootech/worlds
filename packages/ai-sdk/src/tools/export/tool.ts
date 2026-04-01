import type { Tool } from "ai";
import { tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import type { WorldsExportInput, WorldsExportOutput } from "./schema.ts";
import { worldsExportInputSchema, worldsExportOutputSchema } from "./schema.ts";

/** exportData retrieves a world's facts in RDF format. */
export async function exportData(
  worlds: CreateToolsOptions["worlds"],
  input: WorldsExportInput,
): Promise<WorldsExportOutput> {
  const buffer = await worlds.export(input);
  return { data: new TextDecoder().decode(buffer) };
}

/** WorldsExportTool is a tool for exporting RDF data from a world. */
export type WorldsExportTool = Tool<WorldsExportInput, WorldsExportOutput>;

/** worldsExportTool defines the configuration for the world export tool. */
export const worldsExportTool = {
  name: "worlds_export",
  description:
    "Retrieves the entire collection of facts from a world in RDF format. Use this tool when you need to back up a dataset or move data between environments. Input must be a 'world' ID. Returns a string containing the world's facts in N-Quads format.",
  inputSchema: worldsExportInputSchema,
  outputSchema: worldsExportOutputSchema,
};

/** createWorldsExportTool instantiates the world export tool. */
export function createWorldsExportTool(
  { worlds }: CreateToolsOptions,
): WorldsExportTool {
  return tool({
    ...worldsExportTool,
    execute: async (input) => {
      return await exportData(worlds, input);
    },
  });
}
