import type { Tool } from "ai";
import { tool } from "ai";
import type {
  CreateToolsOptions,
  WorldsInterface,
  WorldsTool,
} from "#/types.ts";
import type { WorldsListInput, WorldsListOutput } from "./schema.ts";
import { worldsListInputSchema, worldsListOutputSchema } from "./schema.ts";

/** list retrieves a list of all datasets (worlds). */
export async function list(
  worlds: WorldsInterface,
  input: WorldsListInput,
): Promise<WorldsListOutput> {
  const worldsList = await worlds.list(input);
  return { worlds: worldsList };
}

/** WorldsListTool is a tool for listing worlds. */
export type WorldsListTool = Tool<WorldsListInput, WorldsListOutput>;

/** worldsListTool defines the configuration for the world listing tool. */
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

/** createWorldsListTool instantiates the world listing tool. */
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
