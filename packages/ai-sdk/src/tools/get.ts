import { tool } from "ai";
import type { Tool } from "ai";
import type { GetWorldRequest, World, WorldsEngine } from "@wazoo/worlds-sdk";
import { GetWorldRequestSchema, WorldSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * get retrieves a single world by ID or name.
 */
export async function get(
  worlds: WorldsEngine,
  input: GetWorldRequest,
): Promise<World | null> {
  return await worlds.get(input);
}

/**
 * WorldsGetTool is a tool for getting a world.
 */
export type WorldsGetTool = Tool<GetWorldRequest, World | null>;

/**
 * worldsGetTool defines the configuration for the world retrieval tool.
 */
export const worldsGetTool: WorldsTool<GetWorldRequest, World | null> = {
  name: "worlds_get",
  description:
    "Retrieves metadata for a single dataset (world) by its identifier or name. Use this tool when you need detailed information about a specific world such as its created/updated times.",
  inputSchema: GetWorldRequestSchema,
  outputSchema: WorldSchema.nullable(),
  isWrite: false,
};

/**
 * createWorldsGetTool instantiates the world retrieval tool.
 */
export function createWorldsGetTool(
  { worlds }: CreateToolsOptions,
): WorldsGetTool {
  return tool({
    ...worldsGetTool,
    execute: async (input) => {
      return await get(worlds, input);
    },
  });
}
