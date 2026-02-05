import { z } from "zod";

/**
 * logsTableSchema represents the database schema for logs.
 */
export const logsTableSchema = z.object({
  id: z.string(),
  world_id: z.string(),
  timestamp: z.number(),
  level: z.enum(["info", "warn", "error", "debug"]),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

/**
 * LogsTable represents a log record.
 */
export type LogsTable = z.infer<typeof logsTableSchema>;

/**
 * logsTableInsertSchema represents the data required to insert a new log.
 */
export const logsTableInsertSchema = logsTableSchema;

/**
 * LogsTableInsert represents the type for inserting a log.
 */
export type LogsTableInsert = z.infer<typeof logsTableInsertSchema>;
