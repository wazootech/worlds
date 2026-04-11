import { z } from "zod";

/**
 * Log represents a log entry in the Worlds API.
 */
export interface Log {
  /**
   * level is the severity level of the log (info, warn, error, debug).
   */
  level: string;

  /**
   * message is the log message.
   */
  message: string;

  /**
   * timestamp is the millisecond timestamp of the log entry.
   */
  timestamp: number;

  /**
   * metadata is an optional record of additional log data.
   */
  metadata?: Record<string, unknown>;
}

/**
 * logSchema is the Zod schema for Log.
 */
export const logSchema: z.ZodType<Log> = z.object({
  level: z.string(),
  message: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.any()).optional(),
});
