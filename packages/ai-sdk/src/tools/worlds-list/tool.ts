import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "../../options.ts";
import {
  type WorldsListInput,
  worldsListInputSchema,
  type WorldsListOutput,
  worldsListOutputSchema,
} from "./schema.ts";

export type WorldsListTool = Tool<WorldsListInput, WorldsListOutput>;

export const worldsListTool = {
  name: "worlds_list",
  description:
    "Retrieves a list of all datasets (worlds) currently managed by the engine. Use this tool when you need to know which worlds exist or to find a world's ID by its label. Returns an array of world objects.",
  inputSchema: worldsListInputSchema,
  outputSchema: worldsListOutputSchema,
};

export function createWorldsListTool(
  { worlds }: CreateToolsOptions,
): WorldsListTool {
  return tool({
    ...worldsListTool,
    execute: async (input) => {
      const { page, pageSize } = input;
      const worldsList = await worlds.list({ page, pageSize });
      return { worlds: worldsList };
    },
  });
}
