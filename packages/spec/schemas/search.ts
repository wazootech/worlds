import type { OpenAPIV3_1 } from "openapi-types";

export const SearchResult: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["subject", "predicate", "object", "score", "world"],
  properties: {
    subject: { type: "string" },
    predicate: { type: "string" },
    object: { type: "string" },
    vecRank: { type: ["number", "null"] },
    ftsRank: { type: ["number", "null"] },
    score: { type: "number" },
    world: { "$ref": "#/components/schemas/World" },
  },
};
