import { tool } from "ai";
import type { Tool } from "ai";
import type { DeleteWorldRequest, WorldsEngine } from "@wazoo/worlds-sdk";
import { DeleteWorldRequestSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

/**
 * deleteWorld removes an existing world and all its associated data.
 */
export async function deleteWorld(
  worlds: WorldsEngine,
  input: DeleteWorldRequest,
): Promise<void> {
  await worlds.delete(input);
}

/**
 * WorldsDeleteTool is a tool for deleting a world.
 */
export type WorldsDeleteTool = Tool<DeleteWorldRequest, void>;

/**
 * worldsDeleteTool defines the configuration for the world deletion tool.
 */
export const worldsDeleteTool: WorldsTool<DeleteWorldRequest, void> = {
  name: "worlds_delete",
  description:
    "Permanently deletes a dataset (world) and all of the RDF data and vector embeddings contained within it. CAUTION: This operation is destructive and cannot be undone.",
  inputSchema: DeleteWorldRequestSchema,
  outputSchema: z.void(),
  isWrite: true,
};

/**
 * createWorldsDeleteTool instantiates the world deletion tool.
 */
export function createWorldsDeleteTool(
  { worlds }: CreateToolsOptions,
): WorldsDeleteTool {
  return tool({
    ...worldsDeleteTool,
    execute: async (input) => {
      return await deleteWorld(worlds, input);
    },
  });
}
