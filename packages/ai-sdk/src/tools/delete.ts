import { tool } from "ai";
import type { Tool } from "ai";
import type { DeleteWorldRequest } from "@wazoo/worlds-sdk";
import { zDeleteWorldRequest } from "@wazoo/worlds-spec/zod";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

export type WorldsDeleteTool = Tool<DeleteWorldRequest, void>;

export const worldsDeleteTool: WorldsTool<DeleteWorldRequest, void> = {
  name: "worlds_delete",
  description:
    "Permanently deletes a dataset (world) and all of the RDF data and vector embeddings contained within it. CAUTION: This operation is destructive and cannot be undone.",
  inputSchema: zDeleteWorldRequest,
  outputSchema: z.void(),
  isWrite: true,
};

export function createWorldsDeleteTool(
  { worlds }: CreateToolsOptions,
): WorldsDeleteTool {
  return tool({
    ...worldsDeleteTool,
    execute: async (input: DeleteWorldRequest) => {
      return await worlds.deleteWorld(input);
    },
  });
}
