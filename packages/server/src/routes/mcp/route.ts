import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { LocalWorlds } from "@wazoo/worlds-sdk";

import {
  executeSparqlInputSchema,
  executeSparqlTool,
} from "@wazoo/worlds-ai-sdk/tools/execute-sparql";
import {
  searchEntitiesInputSchema,
  searchEntitiesTool,
} from "@wazoo/worlds-ai-sdk/tools/search-entities";
import {
  worldsListInputSchema,
  worldsListTool,
} from "@wazoo/worlds-ai-sdk/tools/worlds-list";
import {
  worldsGetInputSchema,
  worldsGetTool,
} from "@wazoo/worlds-ai-sdk/tools/worlds-get";
import {
  worldsCreateInputSchema,
  worldsCreateTool,
} from "@wazoo/worlds-ai-sdk/tools/worlds-create";
import {
  worldsImportInputSchema,
  worldsImportTool,
} from "@wazoo/worlds-ai-sdk/tools/worlds-import";
import {
  worldsExportInputSchema,
  worldsExportTool,
} from "@wazoo/worlds-ai-sdk/tools/worlds-export";

import type { ExecuteSparqlInput } from "@wazoo/worlds-ai-sdk/tools/execute-sparql/schema";
import type { SearchEntitiesInput } from "@wazoo/worlds-ai-sdk/tools/search-entities/schema";
import type { WorldsListInput } from "@wazoo/worlds-ai-sdk/tools/worlds-list/schema";
import type { WorldsGetInput } from "@wazoo/worlds-ai-sdk/tools/worlds-get/schema";
import type { WorldsCreateInput } from "@wazoo/worlds-ai-sdk/tools/worlds-create/schema";
import type { WorldsImportInput } from "@wazoo/worlds-ai-sdk/tools/worlds-import/schema";
import type { WorldsExportInput } from "@wazoo/worlds-ai-sdk/tools/worlds-export/schema";

/** mcpRouter defines the MCP server route and registers tools. */
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
      inputSchema: executeSparqlInputSchema,
    },
    async (args: ExecuteSparqlInput) => {
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
    worldsListTool.name,
    {
      title: "List Worlds",
      description: worldsListTool.description,
      inputSchema: worldsListInputSchema,
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

  server.registerTool(
    worldsGetTool.name,
    {
      title: "Get World",
      description: worldsGetTool.description,
      inputSchema: worldsGetInputSchema,
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
    worldsCreateTool.name,
    {
      title: "Create World",
      description: worldsCreateTool.description,
      inputSchema: worldsCreateInputSchema,
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
    worldsImportTool.name,
    {
      title: "Import RDF",
      description: worldsImportTool.description,
      inputSchema: worldsImportInputSchema,
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
    worldsExportTool.name,
    {
      title: "Export RDF",
      description: worldsExportTool.description,
      inputSchema: worldsExportInputSchema,
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
      inputSchema: searchEntitiesInputSchema,
    },
    async (args: SearchEntitiesInput) => {
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

  mcpRouter.post("/mcp", (ctx) => {
    const authorized = authorizeRequest(appContext, ctx.request);
    if (!authorized.admin) {
      return new Response("Unauthorized", { status: 401 });
    }

    return server.server.fetch(ctx.request);
  });

  mcpRouter.get("/mcp", (ctx) => {
    const authorized = authorizeRequest(appContext, ctx.request);
    if (!authorized.admin) {
      return new Response("Unauthorized", { status: 401 });
    }

    return server.server.fetch(ctx.request);
  });

  return mcpRouter;
};
