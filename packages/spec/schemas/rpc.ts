import { SchemaObject } from "npm:openapi3-ts/oas31";

export const GetWorldRequest: SchemaObject = {
  type: "object",
  required: ["source"],
  properties: {
    source: { "$ref": "#/components/schemas/Source" },
  },
};

export const CreateWorldRequest: SchemaObject = {
  type: "object",
  properties: {
    parent: { type: "string" },
    id: { type: "string" },
    displayName: { type: "string" },
    description: { type: "string" },
  },
};

export const UpdateWorldRequest: SchemaObject = {
  type: "object",
  required: ["source"],
  properties: {
    source: { "$ref": "#/components/schemas/Source" },
    displayName: { type: "string" },
    description: { type: "string" },
  },
};

export const DeleteWorldRequest: SchemaObject = {
  type: "object",
  required: ["source"],
  properties: {
    source: { "$ref": "#/components/schemas/Source" },
  },
};

export const ListWorldsRequest: SchemaObject = {
  type: "object",
  properties: {
    parent: { type: "string" },
    pageSize: { type: "integer" },
    pageToken: { type: "string" },
  },
};

export const ListWorldsResponse: SchemaObject = {
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

export const ImportWorldRequest: SchemaObject = {
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

export const ExportWorldRequest: SchemaObject = {
  type: "object",
  required: ["source"],
  properties: {
    source: { "$ref": "#/components/schemas/Source" },
    contentType: { "$ref": "#/components/schemas/ContentType" },
  },
};

export const SearchWorldsRequest: SchemaObject = {
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

export const SparqlQueryRequest: SchemaObject = {
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
