import type { OpenAPIV3_1 } from "openapi-types";

export const SparqlValue: OpenAPIV3_1.SchemaObject = {
  description: "A value in a SPARQL result.",
  oneOf: [
    {
      type: "object",
      required: ["type", "value"],
      properties: {
        type: { type: "string", enum: ["uri"] },
        value: { type: "string" },
      },
    },
    {
      type: "object",
      required: ["type", "value"],
      properties: {
        type: { type: "string", enum: ["bnode"] },
        value: { type: "string" },
      },
    },
    {
      type: "object",
      required: ["type", "value"],
      properties: {
        type: { type: "string", enum: ["literal"] },
        value: { type: "string" },
        "xml:lang": { type: "string" },
        datatype: { type: "string" },
      },
    },
    {
      type: "object",
      required: ["type", "value"],
      properties: {
        type: { type: "string", enum: ["triple"] },
        value: {
          type: "object",
          required: ["subject", "predicate", "object"],
          properties: {
            subject: { "$ref": "#/components/schemas/SparqlValue" },
            predicate: { "$ref": "#/components/schemas/SparqlValue" },
            object: { "$ref": "#/components/schemas/SparqlValue" },
          },
        },
      },
    },
  ],
};

export const SparqlBinding: OpenAPIV3_1.SchemaObject = {
  type: "object",
  additionalProperties: { "$ref": "#/components/schemas/SparqlValue" },
};

export const SparqlSelectResults: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["head", "results"],
  properties: {
    head: {
      type: "object",
      required: ["vars"],
      properties: {
        vars: { type: "array", items: { type: "string" } },
        link: { type: ["array", "null"], items: { type: "string" } },
      },
    },
    results: {
      type: "object",
      required: ["bindings"],
      properties: {
        bindings: {
          type: "array",
          items: { "$ref": "#/components/schemas/SparqlBinding" },
        },
      },
    },
  },
};

export const SparqlAskResults: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["head", "boolean"],
  properties: {
    head: {
      type: "object",
      properties: {
        link: { type: ["array", "null"], items: { type: "string" } },
      },
    },
    boolean: { type: "boolean" },
  },
};

export const SparqlQuad: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["subject", "predicate", "object", "graph"],
  properties: {
    subject: {
      type: "object",
      required: ["type", "value"],
      properties: {
        type: { type: "string", enum: ["uri", "bnode"] },
        value: { type: "string" },
      },
    },
    predicate: {
      type: "object",
      required: ["type", "value"],
      properties: {
        type: { type: "string", enum: ["uri"] },
        value: { type: "string" },
      },
    },
    object: { "$ref": "#/components/schemas/SparqlValue" },
    graph: {
      type: "object",
      required: ["type", "value"],
      properties: {
        type: { type: "string", enum: ["default", "uri"] },
        value: { type: "string" },
      },
    },
  },
};

export const SparqlQuadsResults: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["head", "results"],
  properties: {
    head: {
      type: "object",
      properties: {
        link: { type: ["array", "null"], items: { type: "string" } },
      },
    },
    results: {
      type: "object",
      required: ["quads"],
      properties: {
        quads: {
          type: "array",
          items: { "$ref": "#/components/schemas/SparqlQuad" },
        },
      },
    },
  },
};

export const SparqlQueryResponse: OpenAPIV3_1.SchemaObject = {
  oneOf: [
    { "$ref": "#/components/schemas/SparqlSelectResults" },
    { "$ref": "#/components/schemas/SparqlAskResults" },
    { "$ref": "#/components/schemas/SparqlQuadsResults" },
    { type: "null" },
  ],
};
