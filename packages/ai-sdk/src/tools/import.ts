import { tool } from "ai";
import type { Tool } from "ai";
import type { ImportWorldRequest } from "@wazoo/worlds-sdk";
import { zImportWorldRequest } from "@wazoo/worlds-spec/zod";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

export type WorldsImportTool = Tool<ImportWorldRequest, void>;

export const worldsImportTool: WorldsTool<ImportWorldRequest, void> = {
  name: "worlds_import",
  description: "Loads RDF data into a world.",
  inputSchema: zImportWorldRequest,
  outputSchema: z.void(),
  isWrite: true,
};

export function createWorldsImportTool(
  { worlds }: CreateToolsOptions,
): WorldsImportTool {
  return tool({
    ...worldsImportTool,
    execute: async (input: ImportWorldRequest) => {
      return await worlds.import(input);
    },
  });
}
