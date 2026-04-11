import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type { WorldsImportInput, WorldsInterface } from "@wazoo/worlds-sdk";
import { worldsImportInputSchema } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * WorldsImportOutput is the output for importing RDF data into a world.
 */
export interface WorldsImportOutput {
  success: boolean;
}

/**
 * worldsImportOutputSchema is the Zod schema for world import output.
 */
export const worldsImportOutputSchema: z.ZodType<WorldsImportOutput> = z.object(
  {
    success: z.boolean(),
  },
);

/**
 * importWorld ingests RDF data into a world.
 */
export async function importWorld(
  worlds: WorldsInterface,
  input: WorldsImportInput,
): Promise<WorldsImportOutput> {
  await worlds.import(input);
  return { success: true };
}

/**
 * WorldsImportTool is a tool for importing RDF data into a world.
 */
export type WorldsImportTool = Tool<WorldsImportInput, WorldsImportOutput>;

/**
 * worldsImportTool defines the configuration for the world import tool.
 */
export const worldsImportTool: WorldsTool<
  WorldsImportInput,
  WorldsImportOutput
> = {
  name: "worlds_import",
  description:
    "Ingests RDF data into an existing world's graph. Use this tool when you have raw Turtle, N-Triples, or N-Quads data to upload. Input must be a 'slug' and a 'data' string. Returns a success indicator.",
  inputSchema: worldsImportInputSchema,
  outputSchema: worldsImportOutputSchema,
  isWrite: true,
};

/**
 * createWorldsImportTool instantiates the world import tool.
 */
export function createWorldsImportTool(
  { worlds }: CreateToolsOptions,
): WorldsImportTool {
  return tool({
    ...worldsImportTool,
    execute: async (input) => {
      return await importWorld(worlds, input);
    },
  });
}
