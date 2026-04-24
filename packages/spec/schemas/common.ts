import { SchemaObject } from "npm:openapi3-ts/oas31";
import * as lib from "../lib.ts";

export const ContentType: SchemaObject = {
  type: "string",
  enum: [
    "text/turtle",
    "application/n-quads",
    "application/n-triples",
    "text/n3",
  ],
  description: "Supported RDF serialization content types.",
};

export const TransactionMode: SchemaObject = {
  type: "string",
  enum: ["write", "read", "deferred"],
  description: "Transaction behavior for source access.",
};

export const ErrorResponseData = lib.errorResponse();

export const Log: SchemaObject = {
  type: "object",
  required: ["level", "message", "timestamp"],
  properties: {
    level: { type: "string" },
    message: { type: "string" },
    timestamp: lib.timestamp(),
    metadata: { type: "object", additionalProperties: true },
  },
};
