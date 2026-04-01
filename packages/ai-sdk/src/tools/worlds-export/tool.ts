import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "../../options.ts";
import {
  type WorldsExportInput,
  worldsExportInputSchema,
  type WorldsExportOutput,
  worldsExportOutputSchema,
} from "./schema.ts";

export type WorldsExportTool = Tool<WorldsExportInput, WorldsExportOutput>;

export const worldsExportTool = {
  name: "worlds_export",
  description:
    "Retrieves the entire collection of facts from a world in RDF format. Use this tool when you need to back up a dataset or move data between environments. Input must be a 'world' ID. Returns a string containing the world's facts in N-Quads format.",
  inputSchema: worldsExportInputSchema,
  outputSchema: worldsExportOutputSchema,
};

export function createWorldsExportTool(
  { worlds }: CreateToolsOptions,
): WorldsExportTool {
  return tool({
    ...worldsExportTool,
    execute: async (input) => {
      const buffer = await worlds.export(input.world, {
        contentType: "application/n-quads",
      });
      return { data: new TextDecoder().decode(buffer) };
    },
  });
}
