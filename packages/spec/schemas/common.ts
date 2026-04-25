import type { OpenAPIV3_1 } from "openapi-types";

export function brandedId(name: string): OpenAPIV3_1.SchemaObject {
  return {
    type: "string",
    description: `A branded identifier for a ${name} resource.`,
    "x-brand": name,
  } as any;
}

export function errorResponse(): OpenAPIV3_1.SchemaObject {
  return {
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
  };
}

export function timestamp(
  description = "",
  nullable = false,
): OpenAPIV3_1.SchemaObject {
  return {
    type: nullable ? ["integer", "null"] : "integer",
    format: "int64",
    ...(description ? { description } : {}),
  };
}

export const ContentType: OpenAPIV3_1.SchemaObject = {
  type: "string",
  enum: [
    "text/turtle",
    "application/n-quads",
    "application/n-triples",
    "text/n3",
  ],
  description: "Supported RDF serialization content types.",
};

export const TransactionMode: OpenAPIV3_1.SchemaObject = {
  type: "string",
  enum: ["write", "read", "deferred"],
  description: "Transaction behavior for source access.",
};

export const ErrorResponseData = errorResponse();

export const Log: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["level", "message", "timestamp"],
  properties: {
    level: { type: "string" },
    message: { type: "string" },
    timestamp: timestamp(),
    metadata: { type: "object", additionalProperties: true },
  },
};
