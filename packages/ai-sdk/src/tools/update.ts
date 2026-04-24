import { tool } from "ai";
import type { Tool } from "ai";
import type { UpdateWorldRequest, World } from "@wazoo/worlds-sdk";
import { UpdateWorldRequestSchema, WorldSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

export type WorldsUpdateTool = Tool<UpdateWorldRequest, World>;

export const worldsUpdateTool: WorldsTool<UpdateWorldRequest, World> = {
  name: "worlds_update",
  description:
    "Modifies metadata for an existing dataset (world), such as its display name or description.",
  inputSchema: UpdateWorldRequestSchema,
  outputSchema: WorldSchema,
  isWrite: true,
};

export function createWorldsUpdateTool(
  { management }: CreateToolsOptions,
): WorldsUpdateTool {
  return tool({
    ...worldsUpdateTool,
    execute: async (input: UpdateWorldRequest) => {
      return await management.updateWorld(input);
    },
  });
}
