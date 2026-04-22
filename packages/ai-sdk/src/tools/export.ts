import { tool } from "ai";
import type { Tool } from "ai";
import type { ExportWorldRequest, WorldsData } from "@wazoo/worlds-sdk";
import { ExportWorldRequestSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

/**
 * exportWorld retrieves data from a world.
 */
export async function exportWorld(
  worlds: WorldsData,
  input: ExportWorldRequest,
): Promise<ArrayBuffer> {
  return await worlds.exportData(input);
}

/**
 * WorldsExportTool is a tool for exporting data.
 */
export type WorldsExportTool = Tool<ExportWorldRequest, ArrayBuffer>;

/**
 * worldsExportTool defines the configuration for the data export tool.
 */
export const worldsExportTool: WorldsTool<ExportWorldRequest, ArrayBuffer> = {
  name: "worlds_export",
  description:
    "Retrieves the data stored in a world and returns it as an ArrayBuffer. Default content type is application/n-quads. Use this tool when you need to extract the raw graph data from a world.",
  inputSchema: ExportWorldRequestSchema,
  outputSchema: z.instanceof(ArrayBuffer),
  isWrite: false,
};

/**
 * createWorldsExportTool instantiates the data export tool.
 */
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
