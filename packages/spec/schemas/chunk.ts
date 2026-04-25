import { SchemaObject } from "npm:openapi3-ts/oas31";
import * as lib from "#/lib.ts";

export const ChunkId = lib.brandedId("Chunk");

export const Chunk: SchemaObject = {
  type: "object",
  description: "A text chunk with an optional embedding vector.",
  required: ["id", "fact_id", "subject", "predicate", "text"],
  properties: {
    id: { "$ref": "#/components/schemas/ChunkId" },
    fact_id: { type: "string" },
    subject: { type: "string" },
    predicate: { type: "string" },
    text: { type: "string" },
    vector: {
      type: ["string", "null"],
      format: "byte",
      description: "Base64-encoded embedding vector (Uint8Array).",
    },
  },
};
