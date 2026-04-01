import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type { WorldsExportInput, WorldsInterface } from "@wazoo/worlds-sdk";
import { worldsExportInputSchema } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/** WorldsExportOutput is the output for exporting RDF data from a world in the AI SDK. */
export interface WorldsExportOutput {
  data: string;
}

/** worldsExportOutputSchema is the Zod schema for world export output. */
export const worldsExportOutputSchema: z.ZodType<WorldsExportOutput> = z.object(
  {
    data: z.string(),
  },
);

/** exportWorld retrieves a world's facts in RDF format. */
export async function exportWorld(
  worlds: WorldsInterface,
  input: WorldsExportInput,
): Promise<WorldsExportOutput> {
  const buffer = await worlds.export(input);
  return { data: new TextDecoder().decode(buffer) };
}

/** WorldsExportTool is a tool for exporting RDF data from a world. */
export type WorldsExportTool = Tool<WorldsExportInput, WorldsExportOutput>;

/** worldsExportTool defines the configuration for the world export tool. */
export const worldsExportTool: WorldsTool<
  WorldsExportInput,
  WorldsExportOutput
> = {
  name: "worlds_export",
  description:
    "Retrieves the entire collection of facts from a world in RDF format. Use this tool when you need to back up a dataset or move data between environments. Input must be a 'world' ID. Returns a string containing the world's facts in N-Quads format.",
  inputSchema: worldsExportInputSchema,
  outputSchema: worldsExportOutputSchema,
  isWrite: false,
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
