import type { OpenAPIV3_1 } from "openapi-types";

export const Source: OpenAPIV3_1.SchemaObject = {
  oneOf: [
    { type: "string", description: "A source name identifier." },
    {
      type: "object",
      properties: {
        name: { type: "string" },
        id: { type: "string" },
        namespace: { type: "string" },
        mode: { "$ref": "#/components/schemas/TransactionMode" },
      },
    },
  ],
};
