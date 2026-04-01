import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  type ListLogsInput,
  listLogsInputSchema,
  type ListLogsOutput,
  listLogsOutputSchema,
} from "#/tools/logs/schema.ts";

/** listLogs retrieves execution and audit logs for a specific world. */
export async function listLogs(
  worlds: CreateToolsOptions["worlds"],
  input: ListLogsInput,
): Promise<ListLogsOutput> {
  const { world, page, pageSize, level } = input;
  const logsList = await worlds.listLogs(world, { page, pageSize, level });
  return { logs: logsList };
}

/** LogsListTool is a tool for listing world logs. */
export type LogsListTool = Tool<ListLogsInput, ListLogsOutput>;

/** logsTool defines the configuration for the world logs tool. */
export const logsTool = {
  name: "logs",
  description:
    "Retrieves execution and audit logs for a specific world. Use this tool when you need to troubleshoot operations, verify imports, or audit query history. Input must be a 'world' ID and optional 'page' and 'pageSize'. Returns an array of log objects.",
  inputSchema: listLogsInputSchema,
  outputSchema: listLogsOutputSchema,
};

/** createLogsTool instantiates the world logs tool. */
export function createLogsTool(
  { worlds }: CreateToolsOptions,
): LogsListTool {
  return tool({
    ...logsTool,
    execute: async (input) => {
      return await listLogs(worlds, input);
    },
  });
}
