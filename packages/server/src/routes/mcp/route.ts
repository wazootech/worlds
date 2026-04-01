import { McpServer } from "npm:@modelcontextprotocol/sdk@1.29.0/server/mcp.js";
import { z } from "zod";
import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { LocalWorlds } from "@wazoo/worlds-sdk";
import {
  executeSparqlTool,
  searchEntitiesTool,
  worldsQuerySchema,
  worldsListSchema,
  worldsGetSchema,
  worldsCreateSchema,
  worldsImportSchema,
  worldsExportSchema,
  worldsSearchSchema,
  executeSparqlToolDefinition,
  worldsListToolDefinition,
  worldsGetToolDefinition,
  worldsCreateToolDefinition,
  worldsImportToolDefinition,
  worldsExportToolDefinition,
  searchEntitiesToolDefinition,
} from "@wazoo/worlds-ai-sdk";
import type {
  WorldsCreateInput,
  WorldsExportInput,
  WorldsGetInput,
  WorldsImportInput,
  WorldsListInput,
  WorldsQueryInput,
  WorldsSearchInput,
} from "@wazoo/worlds-ai-sdk";

export default (appContext: WorldsContext) => {
  const worlds = new LocalWorlds(appContext);

  const server = new McpServer({
    name: "worlds-server",
    version: "0.0.1",
  }, {
    capabilities: {
      tools: {},
      resources: {},
    },
  });

  server.registerTool(
    executeSparqlTool.name,
    {
      title: "Worlds SPARQL Query",
      description: executeSparqlTool.description,
      inputSchema: worldsQuerySchema,
      outputSchema: executeSparqlTool.outputSchema,
    },
    async (args: WorldsQueryInput) => {
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
      title: "List Worlds",
      description: "List all available worlds",
      inputSchema: worldsListSchema,
    },
    async (args: WorldsListInput) => {
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
      title: "Get World",
      description: "Get a world by ID",
      inputSchema: worldsGetSchema,
    },
    async (args: WorldsGetInput) => {
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
      title: "Create World",
      description: "Create a new world",
      inputSchema: worldsCreateSchema,
    },
    async (args: WorldsCreateInput) => {
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
      title: "Import RDF",
      description: "Import RDF data into a world",
      inputSchema: worldsImportSchema,
    },
    async (args: WorldsImportInput) => {
      await worlds.import(args.world, args.data, {
        contentType: "application/n-triples",
      });
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
      title: "Export RDF",
      description: "Export a world as RDF data",
      inputSchema: worldsExportSchema,
    },
    async (args: WorldsExportInput) => {
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
    searchEntitiesTool.name,
    {
      title: "Search Entities",
      description: searchEntitiesTool.description,
      inputSchema: worldsSearchSchema,
    },
    async (args: WorldsSearchInput) => {
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

  const mcpRouter = new Router();

  mcpRouter.post("/mcp", async (ctx) => {
    const authorized = authorizeRequest(appContext, ctx.request);
    if (!authorized.admin) {
      return new Response("Unauthorized", { status: 401 });
    }
    return server.server.fetch(ctx.request);
  });

  mcpRouter.get("/mcp", async (ctx) => {
    const authorized = authorizeRequest(appContext, ctx.request);
    if (!authorized.admin) {
      return new Response("Unauthorized", { status: 401 });
    }
    return server.server.fetch(ctx.request);
  });

  return mcpRouter;
};
