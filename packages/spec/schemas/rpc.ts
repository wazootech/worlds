import type { OpenAPIV3_1 } from "openapi-types";

export const GetWorldRequest: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["source"],
  properties: {
    source: { "$ref": "#/components/schemas/Source" },
  },
};

export const CreateWorldRequest: OpenAPIV3_1.SchemaObject = {
  type: "object",
  properties: {
    parent: { type: "string" },
    id: { type: "string" },
    displayName: { type: "string" },
    description: { type: "string" },
  },
};

export const UpdateWorldRequest: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["source"],
  properties: {
    source: { "$ref": "#/components/schemas/Source" },
    displayName: { type: "string" },
    description: { type: "string" },
  },
};

export const DeleteWorldRequest: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["source"],
  properties: {
    source: { "$ref": "#/components/schemas/Source" },
  },
};

export const ListWorldsRequest: OpenAPIV3_1.SchemaObject = {
  type: "object",
  properties: {
    parent: { type: "string" },
    pageSize: { type: "integer" },
    pageToken: { type: "string" },
  },
};

export const ListWorldsResponse: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["worlds"],
  properties: {
    worlds: {
      type: "array",
      items: { "$ref": "#/components/schemas/World" },
    },
    nextPageToken: { type: "string" },
  },
};

export const ImportWorldRequest: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["source", "data"],
  properties: {
    source: { "$ref": "#/components/schemas/Source" },
    data: {
      type: "string",
      description: "RDF data to import (can be base64-encoded).",
    },
    contentType: { "$ref": "#/components/schemas/ContentType" },
  },
};

export const ExportWorldRequest: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["source"],
  properties: {
    source: { "$ref": "#/components/schemas/Source" },
    contentType: { "$ref": "#/components/schemas/ContentType" },
  },
};

export const SearchWorldsRequest: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["query"],
  properties: {
    sources: {
      type: "array",
      items: { "$ref": "#/components/schemas/Source" },
    },
    parent: { type: "string" },
    query: { type: "string" },
    pageSize: { type: "integer" },
    pageToken: { type: "string" },
    subjects: { type: "array", items: { type: "string" } },
    predicates: { type: "array", items: { type: "string" } },
    types: { type: "array", items: { type: "string" } },
  },
};

export const SparqlQueryRequest: OpenAPIV3_1.SchemaObject = {
  type: "object",
  required: ["query"],
  properties: {
    sources: {
      type: "array",
      items: { "$ref": "#/components/schemas/Source" },
    },
    parent: { type: "string" },
    query: { type: "string" },
    defaultGraphUris: { type: "array", items: { type: "string" } },
    namedGraphUris: { type: "array", items: { type: "string" } },
  },
};
