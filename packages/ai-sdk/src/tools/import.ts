import { tool } from "ai";
import type { Tool } from "ai";
import type { ImportWorldRequest, WorldsEngine } from "@wazoo/worlds-sdk";
import { ImportWorldRequestSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

/**
 * importWorld loads data into a world.
 */
export async function importWorld(
  worlds: WorldsEngine,
  input: ImportWorldRequest,
): Promise<void> {
  await worlds.import(input);
}

/**
 * WorldsImportTool is a tool for importing data.
 */
export type WorldsImportTool = Tool<ImportWorldRequest, void>;

/**
 * worldsImportTool defines the configuration for the data import tool.
 */
export const worldsImportTool: WorldsTool<ImportWorldRequest, void> = {
  name: "worlds_import",
  description:
    "Loads RDF data into a world. The data can be provided in various formats such as Turtle, JSON-LD, or N-Quads. Use this tool when you need to populate a world with external data or large blocks of RDF.",
  inputSchema: ImportWorldRequestSchema,
  outputSchema: z.void(),
  isWrite: true,
};

/**
 * createWorldsImportTool instantiates the data import tool.
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
