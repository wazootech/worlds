import { tool } from "ai";
import type { Tool } from "ai";
import type {
  CreateWorldRequest,
  World,
  WorldsManagement,
} from "@wazoo/worlds-sdk";
import { CreateWorldRequestSchema, WorldSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * create initializes a new world (dataset).
 */
export async function create(
  management: WorldsManagement,
  input: CreateWorldRequest,
): Promise<World> {
  return await management.createWorld(input);
}

/**
 * WorldsCreateTool is a tool for creating a world.
 */
export type WorldsCreateTool = Tool<CreateWorldRequest, World>;

/**
 * worldsCreateTool defines the configuration for the world creation tool.
 */
export const worldsCreateTool: WorldsTool<CreateWorldRequest, World> = {
  name: "worlds_create",
  description:
    "Initializes a new dataset (world) with a provided display name and optional description. Use this tool when a user wants to start a new project or create a new logical space for their data.",
  inputSchema: CreateWorldRequestSchema,
  outputSchema: WorldSchema,
  isWrite: true,
};

/**
 * createWorldsCreateTool instantiates the world creation tool.
 */
export function createWorldsCreateTool(
  { management }: CreateToolsOptions,
): WorldsCreateTool {
  return tool({
    ...worldsCreateTool,
    execute: async (input) => {
      return await create(management, input);
    },
  });
}
