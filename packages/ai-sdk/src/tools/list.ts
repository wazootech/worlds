import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type {
  ListWorldsRequest,
  ListWorldsResponse,
  WorldsEngine,
} from "@wazoo/worlds-sdk";
import { ListWorldsRequestSchema, WorldSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * list retrieves a list of all datasets (worlds).
 */
export async function list(
  worlds: WorldsEngine,
  input: ListWorldsRequest,
): Promise<ListWorldsResponse> {
  return await worlds.list(input);
}

/**
 * WorldsListTool is a tool for listing worlds.
 */
export type WorldsListTool = Tool<ListWorldsRequest, ListWorldsResponse>;

/**
 * worldsListTool defines the configuration for the world listing tool.
 */
export const worldsListTool: WorldsTool<
  ListWorldsRequest,
  ListWorldsResponse
> = {
  name: "worlds_list",
  description:
    "Retrieves a list of all datasets (worlds) currently managed by the engine. Use this tool when you need to know which worlds exist or to find a world's ID by its label. Returns an array of world objects.",
  inputSchema: ListWorldsRequestSchema,
  outputSchema: z.object({
    worlds: z.array(WorldSchema),
    nextPageToken: z.string().optional(),
  }),
  isWrite: false,
};

/**
 * createWorldsListTool instantiates the world listing tool.
 */
export function createWorldsListTool(
  { worlds }: CreateToolsOptions,
): WorldsListTool {
  return tool({
    ...worldsListTool,
    execute: async (input) => {
      return await list(worlds, input);
    },
  });
}
