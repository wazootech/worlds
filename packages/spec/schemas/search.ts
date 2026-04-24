import { SchemaObject } from "npm:openapi3-ts/oas31";

export const SearchResult: SchemaObject = {
  type: "object",
  required: ["subject", "predicate", "object", "score", "world"],
  properties: {
    subject: { type: "string" },
    predicate: { type: "string" },
    object: { type: "string" },
    vecRank: { type: "number", nullable: true },
    ftsRank: { type: "number", nullable: true },
    score: { type: "number" },
    world: { "$ref": "#/components/schemas/World" },
  },
};
