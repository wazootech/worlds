import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type {
  World,
  WorldsInterface,
  WorldsListInput,
} from "@wazoo/worlds-sdk";
import { worldSchema, worldsListInputSchema } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * WorldsListOutput is the output for listing worlds.
 */
export interface WorldsListOutput {
  worlds: World[];
}

/**
 * worldsListOutputSchema is the Zod schema for world listing output.
 */
export const worldsListOutputSchema: z.ZodType<WorldsListOutput> = z.object({
  worlds: z.array(worldSchema),
});

/**
 * list retrieves a list of all datasets (worlds).
 */
export async function list(
  worlds: WorldsInterface,
  input: WorldsListInput,
): Promise<WorldsListOutput> {
  const worldsList = await worlds.list(input);
  return { worlds: worldsList };
}

/**
 * WorldsListTool is a tool for listing worlds.
 */
export type WorldsListTool = Tool<WorldsListInput, WorldsListOutput>;

/**
 * worldsListTool defines the configuration for the world listing tool.
 */
export const worldsListTool: WorldsTool<
  WorldsListInput,
  WorldsListOutput
> = {
  name: "worlds_list",
  description:
    "Retrieves a list of all datasets (worlds) currently managed by the engine. Use this tool when you need to know which worlds exist or to find a world's ID by its label. Returns an array of world objects.",
  inputSchema: worldsListInputSchema,
  outputSchema: worldsListOutputSchema,
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

