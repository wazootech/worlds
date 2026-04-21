import { z } from "../../shared/z.ts";

/**
 * ContentType represents the supported RDF serialization content types.
 */
export type ContentType =
  | "text/turtle"
  | "application/n-quads"
  | "application/n-triples"
  | "text/n3";

/**
 * contentTypeSchema is the Zod schema for ContentType.
 */
export const contentTypeSchema = z.enum([
  "text/turtle",
  "application/n-quads",
  "application/n-triples",
  "text/n3",
]);

/**
 * TransactionMode represents the transaction behavior for a source access.
 * Consistent with Turso/libsql.
 */
export type TransactionMode = "write" | "read" | "deferred";

/**
 * transactionModeSchema is the Zod schema for TransactionMode.
 */
export const transactionModeSchema = z.enum(["write", "read", "deferred"]);

/**
 * ErrorResponseData is the standard error response format.
 */
export interface ErrorResponseData {
  error: {
    message: string;
  };
}

/**
 * errorResponseDataSchema is the Zod schema for ErrorResponseData.
 */
export const errorResponseDataSchema = z.object({
  error: z.object({
    message: z.string(),
  }),
});

/**
 * Log represents a log entry in the Worlds API.
 */
export interface Log {
  level: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * logSchema is the Zod schema for Log.
 */
export const logSchema = z.object({
  level: z.string(),
  message: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
