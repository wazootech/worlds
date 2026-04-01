// @ts-nocheck - MCP SDK type mismatches with Zod v4
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.8.0/server/mcp.js";
import { z } from "zod";
import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { LocalWorlds } from "@wazoo/worlds-sdk";
import {
  executeSparqlTool,
  searchEntitiesTool,
  worldsSearchOutputSchema,
  worldsQuerySchema,
  worldsListSchema,
  worldsGetSchema,
  worldsCreateSchema,
  worldsImportSchema,
  worldsExportSchema,
  worldsSearchSchema,
} from "@wazoo/worlds-ai-sdk";
import type { WorldsListInput, WorldsGetInput, WorldsCreateInput, WorldsImportInput, WorldsExportInput, WorldsSearchInput } from "@wazoo/worlds-ai-sdk";

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

  server.tool(
    executeSparqlTool.name,
    {
      description: executeSparqlTool.description,
      ...executeSparqlTool.inputSchema,
    },
    async (args: { world: string; query: string }) => {
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

  server.tool(
    "worlds_list",
    {
      description: "List all available worlds",
      ...worldsListSchema.shape,
    },
    async (args: WorldsListInput) => {
      const result = await worlds.list({
        page: args.page,
        pageSize: args.pageSize,
      });
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

  server.tool(
    "worlds_get",
    {
      description: "Get a world by ID",
      ...worldsGetSchema.shape,
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

  server.tool(
    "worlds_create",
    {
      description: "Create a new world",
      ...worldsCreateSchema.shape,
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

  server.tool(
    "worlds_import",
    {
      description: "Import RDF data into a world",
      ...worldsImportSchema.shape,
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

  server.tool(
    "worlds_export",
    {
      description: "Export a world as RDF data",
      ...worldsExportSchema.shape,
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

  server.tool(
    searchEntitiesTool.name,
    {
      description: searchEntitiesTool.description,
      ...searchEntitiesTool.inputSchema.shape,
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