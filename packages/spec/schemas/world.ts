import { SchemaObject } from "npm:openapi3-ts/oas31";
import * as lib from "../lib.ts";

export const WorldId = lib.brandedId("World");

export const World: SchemaObject = {
  type: "object",
  description: "Metadata for a single world.",
  required: ["displayName"],
  properties: {
    name: {
      type: "string",
      description: "The canonical resource name.",
      readOnly: true,
    },
    id: { "$ref": "#/components/schemas/WorldId" },
    namespace: { type: "string" },
    displayName: { type: "string" },
    description: { type: "string" },
    createTime: { type: "number" },
    updateTime: { type: "number" },
    deleteTime: { type: ["number", "null"] },
  },
};
