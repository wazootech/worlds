import { tool } from "ai";
import type { Tool } from "ai";
import type { GetWorldRequest, World, WorldsManagementPlane } from "@wazoo/worlds-sdk";
import { GetWorldRequestSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

export type WorldsGetTool = Tool<GetWorldRequest, World | null>;

export const worldsGetTool: WorldsTool<GetWorldRequest, World | null> = {
  name: "worlds_get",
  description: "Retrieves metadata for a single dataset (world) by its identifier or name.",
  inputSchema: GetWorldRequestSchema,
  outputSchema: z.any(),
  isWrite: false,
};

export function createWorldsGetTool(
  { management }: CreateToolsOptions,
): WorldsGetTool {
  return tool({
    ...worldsGetTool,
    execute: async (input: GetWorldRequest) => {
      return await management.getWorld(input);
    },
  });
}