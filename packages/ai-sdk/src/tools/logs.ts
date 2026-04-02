import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type { Log, WorldsInterface, WorldsLogsInput } from "@wazoo/worlds-sdk";
import { logSchema, worldsLogsInputSchema } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, WorldsTool } from "#/types.ts";

/**
 * WorldsLogsOutput is the output for retrieving logs in the AI SDK.
 */
export interface WorldsLogsOutput {
  logs: Log[];
}

/**
 * worldsLogsOutputSchema is the Zod schema for log retrieval output.
 */
export const worldsLogsOutputSchema: z.ZodType<WorldsLogsOutput> = z.object({
  logs: z.array(logSchema),
});

/**
 * listLogs retrieves execution and audit logs for a specific world.
 */
export async function listLogs(
  worlds: WorldsInterface,
  input: WorldsLogsInput,
): Promise<WorldsLogsOutput> {
  const logsList = await worlds.listLogs(input);
  return { logs: logsList };
}

/**
 * WorldsLogsTool is a tool for listing world logs.
 */
export type WorldsLogsTool = Tool<WorldsLogsInput, WorldsLogsOutput>;

/**
 * worldsLogsTool defines the configuration for the world logs tool.
 */
export const worldsLogsTool: WorldsTool<
  WorldsLogsInput,
  WorldsLogsOutput
> = {
  name: "worlds_logs",
  description:
    "Retrieves execution and audit logs for a specific world. Use this tool when you need to troubleshoot operations, verify imports, or audit query history. Input must be a 'world' ID and optional 'page' and 'pageSize'. Returns an array of log objects.",
  inputSchema: worldsLogsInputSchema,
  outputSchema: worldsLogsOutputSchema,
  isWrite: false,
};

/**
 * createWorldsLogsTool instantiates the world logs tool.
 */
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
