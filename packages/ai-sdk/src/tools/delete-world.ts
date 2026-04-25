import { tool } from "ai";
import type { Tool } from "ai";
import type { DeleteWorldRequest } from "@wazoo/worlds-sdk";
import { zDeleteWorldRequest } from "@wazoo/worlds-spec/zod";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

export type WorldsDeleteWorldTool = Tool<DeleteWorldRequest, void>;

export const worldsDeleteWorldTool: WorldsTool<DeleteWorldRequest, void> = {
  name: "worlds_delete_world",
  description:
    "Permanently deletes a dataset (world) and all of the RDF data and vector embeddings contained within it. CAUTION: This operation is destructive and cannot be undone.",
  inputSchema: zDeleteWorldRequest,
  outputSchema: z.void(),
  isWrite: true,
};

export function createWorldsDeleteWorldTool(
  { worlds }: CreateToolsOptions,
): WorldsDeleteWorldTool {
  return tool({
    ...worldsDeleteWorldTool,
    execute: async (input: DeleteWorldRequest) => {
      return await worlds.deleteWorld(input);
    },
  });
}
