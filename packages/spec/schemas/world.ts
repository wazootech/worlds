import type { OpenAPIV3_1 } from "openapi-types";
import * as u from "./common.ts";

export const WorldId = u.brandedId("World");

export const World: OpenAPIV3_1.SchemaObject = {
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
