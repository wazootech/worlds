import { tool } from "ai";
import type { Tool } from "ai";
import type { ExportWorldRequest } from "@wazoo/worlds-sdk";
import { ExportWorldRequestSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

export type WorldsExportTool = Tool<ExportWorldRequest, ArrayBuffer>;

export const worldsExportTool: WorldsTool<ExportWorldRequest, ArrayBuffer> = {
  name: "worlds_export",
  description:
    "Retrieves the data stored in a world and returns it as an ArrayBuffer.",
  inputSchema: ExportWorldRequestSchema,
  outputSchema: z.instanceof(ArrayBuffer),
  isWrite: false,
};

export function createWorldsExportTool(
  { data }: CreateToolsOptions,
): WorldsExportTool {
  return tool({
    ...worldsExportTool,
    execute: async (input: ExportWorldRequest) => {
      return await data.export(input);
    },
  });
}
