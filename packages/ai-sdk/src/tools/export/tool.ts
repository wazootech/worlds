import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  type WorldsExportInput,
  worldsExportInputSchema,
  type WorldsExportOutput,
  worldsExportOutputSchema,
} from "#/tools/export/schema.ts";

/** exportWorld retrieves a world's facts in N-Quads format. */
export async function exportWorld(
  worlds: CreateToolsOptions["worlds"],
  input: WorldsExportInput,
): Promise<WorldsExportOutput> {
  const buffer = await worlds.export(input.world, {
    contentType: "application/n-quads",
  });
  return { data: new TextDecoder().decode(buffer) };
}

/** WorldsExportTool is a tool for exporting RDF data from a world. */
export type WorldsExportTool = Tool<WorldsExportInput, WorldsExportOutput>;

/** worldsExportTool defines the configuration for the world export tool. */
export const worldsExportTool = {
  name: "export_world",
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
      return await exportWorld(worlds, input);
    },
  });
}
