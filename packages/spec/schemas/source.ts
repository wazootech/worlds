import { SchemaObject } from "npm:openapi3-ts/oas31";

export const Source: SchemaObject = {
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
