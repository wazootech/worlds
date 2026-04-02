import { z } from "zod";

/**
 * Log represents a log entry in a world.
 */
export interface Log {
  /**
   * id is the unique identifier of the log entry.
   */
  id: string;

  /**
   * worldId is the ID of the world the log belongs to.
   */
  worldId: string;

  /**
   * timestamp is the millisecond timestamp of the log.
   */
  timestamp: number;

  /**
   * level is the severity level of the log.
   */
  level: "info" | "warn" | "error" | "debug";

  /**
   * message is the human-readable log message.
   */
  message: string;

  /**
   * metadata is optional structured context for the log.
   */
  metadata: Record<string, unknown> | null;
}

/**
 * logSchema is the Zod schema for Log.
 */
export const logSchema: z.ZodType<Log> = z.object({
  id: z.string(),
  worldId: z.string(),
  timestamp: z.number(),
  level: z.enum(["info", "warn", "error", "debug"]),
  message: z.string(),
  metadata: z.record(z.string(), z.any()).nullable(),
});

/**
 * WorldsLogsInput represents the parameters for retrieving logs.
 */
export interface WorldsLogsInput {
  /**
   * world is the ID or slug of the world to retrieve logs for.
   */
  world: string;

  /**
   * page is the 1-indexed page number to fetch.
   */
  page?: number;

  /**
   * pageSize is the number of items per page.
   */
  pageSize?: number;

  /**
   * level is the optional severity level to filter by.
   */
  level?: string;
}

/**
 * worldsLogsInputSchema is the Zod schema for WorldsLogsInput.
 */
export const worldsLogsInputSchema: z.ZodType<WorldsLogsInput> = z.object({
  world: z.string().describe(
    "The ID or slug of the world to retrieve logs for.",
  ),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  level: z.string().optional(),
});
