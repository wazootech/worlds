import { SchemaObject } from "npm:openapi3-ts/oas31";
import * as lib from "#/lib.ts";

export const FactId = lib.brandedId("Fact");

export const Fact: SchemaObject = {
  type: "object",
  description: "A single triple/quad in a world.",
  required: ["subject", "predicate", "object", "type"],
  properties: {
    id: { "$ref": "#/components/schemas/FactId" },
    subject: { type: "string" },
    predicate: { type: "string" },
    object: { type: "string" },
    type: { type: "string" },
    lang: { type: "string" },
    datatype: { type: "string" },
    world_id: { type: "string" },
    created_at: lib.timestamp(),
    deleted_at: lib.timestamp("", true),
  },
};
