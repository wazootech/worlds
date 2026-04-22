import { tool } from "ai";
import type { Tool } from "ai";
import type {
  ListWorldsRequest,
  ListWorldsResponse,
  WorldsManagementPlane,
} from "@wazoo/worlds-sdk";
import { ListWorldsRequestSchema } from "#/utils/validation.ts";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";
import { z } from "zod";

export type WorldsListTool = Tool<ListWorldsRequest, ListWorldsResponse>;

export const worldsListTool: WorldsTool<
  ListWorldsRequest,
  ListWorldsResponse
> = {
  name: "worlds_list",
  description: "Retrieves a list of all datasets (worlds) currently managed by the engine.",
  inputSchema: ListWorldsRequestSchema,
  outputSchema: z.any(),
  isWrite: false,
};

export function createWorldsListTool(
  { management }: CreateToolsOptions,
): WorldsListTool {
  return tool({
    ...worldsListTool,
    execute: async (input: ListWorldsRequest) => {
      return await management.listWorlds(input);
    },
  });
}