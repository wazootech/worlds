import { McpServer } from "@modelcontextprotocol/sdk";
import { z } from "zod";
import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import {
  LocalWorlds,
  worldsQuerySchema,
  worldsListSchema,
  worldsGetSchema,
  worldsCreateSchema,
  worldsImportSchema,
  worldsExportSchema,
  worldsSearchSchema,
  worldsSearchOutputSchema,
  type WorldsQueryInput,
  type WorldsListInput,
  type WorldsGetInput,
  type WorldsCreateInput,
  type WorldsImportInput,
  type WorldsExportInput,
  type WorldsSearchInput,
} from "@wazoo/worlds-sdk";

export default (appContext: WorldsContext) => {
  const worlds = new LocalWorlds(appContext);

  const server = new McpServer(
    {
      name: "worlds-server",
      version: "0.0.1",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  server.registerTool(
    "worlds_query",
    {
      description: "Query a Worlds knowledge graph using SPARQL",
      inputSchema: worldsQuerySchema,
    },
    async (args) => {
      const result = await worlds.sparql(args.world, args.query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "worlds_list",
    {
      description: "List all available worlds",
      inputSchema: worldsListSchema,
    },
    async (args) => {
      const result = await worlds.list({ page: args.page, pageSize: args.pageSize });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "worlds_get",
    {
      description: "Get a world by ID",
      inputSchema: worldsGetSchema,
    },
    async (args) => {
      const worldData = await worlds.get(args.world);
      if (!worldData) {
        return {
          content: [{ type: "text", text: "World not found" }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(worldData, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "worlds_create",
    {
      description: "Create a new world",
      inputSchema: worldsCreateSchema,
    },
    async (args) => {
      const world = await worlds.create(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(world, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "worlds_import",
    {
      description: "Import RDF data into a world",
      inputSchema: worldsImportSchema,
    },
    async (args) => {
      await worlds.import(args.world, args.data, { contentType: "application/n-triples" });
      return {
        content: [
          {
            type: "text",
            text: "Data imported successfully",
          },
        ],
      };
    },
  );

  server.registerTool(
    "worlds_export",
    {
      description: "Export a world as RDF data",
      inputSchema: worldsExportSchema,
    },
    async (args) => {
      const buffer = await worlds.export(args.world, {
        contentType: "application/n-quads",
      });
      return {
        content: [
          {
            type: "text",
            text: new TextDecoder().decode(buffer),
          },
        ],
      };
    },
  );

  server.registerTool(
    "worlds_search",
    {
      description: "Search for facts in a Worlds knowledge graph using semantic search",
      inputSchema: worldsSearchSchema,
      outputSchema: worldsSearchOutputSchema,
    },
    async (args) => {
      const results = await worlds.search(args.world, args.query, {
        limit: args.limit,
        types: args.types,
        subjects: args.subjects,
        predicates: args.predicates,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ results }, null, 2),
          },
        ],
      };
    },
  );

  server.setRequestHandler(
    { method: "resources/list" },
    async () => {
      return { resources: [] };
    },
  );

  server.setRequestHandler(
    { method: "resources/read" },
    async () => {
      return { contents: [] };
    },
  );

  const mcpRouter = new Router();

  mcpRouter.post("/mcp", async (ctx) => {
    const authorized = authorizeRequest(appContext, ctx.request);
    if (!authorized.admin) {
      return new Response("Unauthorized", { status: 401 });
    }
    return server.fetch(ctx.request);
  });

  mcpRouter.get("/mcp", async (ctx) => {
    const authorized = authorizeRequest(appContext, ctx.request);
    if (!authorized.admin) {
      return new Response("Unauthorized", { status: 401 });
    }
    return server.fetch(ctx.request);
  });

  return mcpRouter;
};
