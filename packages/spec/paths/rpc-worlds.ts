import type { PathItemObject } from "npm:openapi3-ts/oas31";

export const rpcWorlds: PathItemObject = {
  post: {
    summary: "Unified RPC endpoint for worlds.",
    operationId: "worldsRpc",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            oneOf: [
              { "$ref": "#/components/schemas/GetWorldRequest" },
              { "$ref": "#/components/schemas/CreateWorldRequest" },
              { "$ref": "#/components/schemas/UpdateWorldRequest" },
              { "$ref": "#/components/schemas/DeleteWorldRequest" },
              { "$ref": "#/components/schemas/ListWorldsRequest" },
              { "$ref": "#/components/schemas/ImportWorldRequest" },
              { "$ref": "#/components/schemas/ExportWorldRequest" },
              { "$ref": "#/components/schemas/SearchWorldsRequest" },
              { "$ref": "#/components/schemas/SparqlQueryRequest" },
            ],
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: {
              oneOf: [
                { "$ref": "#/components/schemas/World" },
                { "$ref": "#/components/schemas/ListWorldsResponse" },
                { "$ref": "#/components/schemas/SparqlQueryResponse" },
                {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: { "$ref": "#/components/schemas/SearchResult" },
                    },
                    nextPageToken: { type: "string" },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
};
