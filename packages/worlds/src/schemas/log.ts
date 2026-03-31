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
