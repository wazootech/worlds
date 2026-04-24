import { SchemaObject } from "npm:openapi3-ts/oas31";

export * from "./zod.gen.ts";

/**
 * Creates a branded string identifier schema.
 */
export const brandedId = (name: string): SchemaObject => ({
  type: "string",
  description: `A branded identifier for a ${name} resource.`,
  "x-brand": name,
});

/**
 * Standard error response structure.
 */
export const errorResponse = (): SchemaObject => ({
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["message"],
      properties: {
        message: { type: "string" },
      },
    },
  },
});

/**
 * Standard int64 timestamp.
 */
export const timestamp = (description = "", nullable = false): SchemaObject => ({
  type: nullable ? ["integer", "null"] : "integer",
  format: "int64",
  ...(description ? { description } : {}),
});
