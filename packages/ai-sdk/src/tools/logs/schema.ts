import { z } from "zod";
import type { Log } from "@wazoo/worlds-sdk";
import { logSchema } from "@wazoo/worlds-sdk";

/** ListLogsInput is the input for listing world logs. */
export interface ListLogsInput {
  world: string;
  page?: number;
  pageSize?: number;
  level?: "info" | "warn" | "error" | "debug";
}

/** listLogsInputSchema is the Zod schema for world logs input. */
export const listLogsInputSchema: z.ZodType<ListLogsInput> = z.object({
  world: z.string().describe("The world ID to retrieve logs for"),
  page: z.number().min(1).default(1).optional().describe("The page number"),
  pageSize: z.number().min(1).max(100).default(20).optional().describe(
    "The number of logs per page",
  ),
  level: z.enum(["info", "warn", "error", "debug"]).optional().describe(
    "The log level to filter by",
  ),
});

/** ListLogsOutput is the output for listing world logs. */
export interface ListLogsOutput {
  logs: Log[];
}

/** listLogsOutputSchema is the Zod schema for world logs output. */
export const listLogsOutputSchema: z.ZodType<ListLogsOutput> = z.object({
  logs: z.array(logSchema),
});
