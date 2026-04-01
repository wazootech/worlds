import type { Tool } from "ai";
import { tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import type { WorldsLogsInput, WorldsLogsOutput } from "./schema.ts";
import { worldsLogsInputSchema, worldsLogsOutputSchema } from "./schema.ts";

/** listLogs retrieves execution and audit logs for a specific world. */
export async function listLogs(
  worlds: CreateToolsOptions["worlds"],
  input: WorldsLogsInput,
): Promise<WorldsLogsOutput> {
  const logsList = await worlds.listLogs(input);
  return { logs: logsList };
}

/** WorldsLogsTool is a tool for listing world logs. */
export type WorldsLogsTool = Tool<WorldsLogsInput, WorldsLogsOutput>;

/** worldsLogsTool defines the configuration for the world logs tool. */
export const worldsLogsTool = {
  name: "worlds_logs",
  description:
    "Retrieves execution and audit logs for a specific world. Use this tool when you need to troubleshoot operations, verify imports, or audit query history. Input must be a 'world' ID and optional 'page' and 'pageSize'. Returns an array of log objects.",
  inputSchema: worldsLogsInputSchema,
  outputSchema: worldsLogsOutputSchema,
};

/** createWorldsLogsTool instantiates the world logs tool. */
export function createWorldsLogsTool(
  { worlds }: CreateToolsOptions,
): WorldsLogsTool {
  return tool({
    ...worldsLogsTool,
    execute: async (input) => {
      return await listLogs(worlds, input);
    },
  });
}
