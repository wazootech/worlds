import { z } from "zod";

/**
 * LogsTable represents a log record.
 */
export interface LogsTable {
  id: string;
  world_id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * logsTableSchema represents the database schema for logs.
 */
const logsTableShape = z.object({
  id: z.string(),
  world_id: z.string(),
  timestamp: z.number(),
  level: z.enum(["info", "warn", "error", "debug"]),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

export const logsTableSchema: z.ZodType<LogsTable> = logsTableShape;

/**
 * LogsTableInsert represents the type for inserting a log.
 */
export type LogsTableInsert = LogsTable;

/**
 * logsTableInsertSchema represents the data required to insert a new log.
 */
export const logsTableInsertSchema: z.ZodType<
  LogsTableInsert
> = logsTableSchema;
