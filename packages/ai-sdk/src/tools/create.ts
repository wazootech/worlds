import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateWorldRequest, World } from "@wazoo/worlds-sdk";
import { CreateWorldRequestSchema, WorldSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

export type WorldsCreateTool = Tool<CreateWorldRequest, World>;

export const worldsCreateTool: WorldsTool<CreateWorldRequest, World> = {
  name: "worlds_create",
  description:
    "Initializes a new dataset (world) with a provided display name and optional description.",
  inputSchema: CreateWorldRequestSchema,
  outputSchema: WorldSchema,
  isWrite: true,
};

export function createWorldsCreateTool(
  { management }: CreateToolsOptions,
): WorldsCreateTool {
  return tool({
    ...worldsCreateTool,
    execute: async (input: CreateWorldRequest) => {
      return await management.createWorld(input);
    },
  });
}
