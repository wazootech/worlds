import { McpServer } from "npm:@modelcontextprotocol/sdk@1.29.0";
import { z } from "zod";
import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import {
  LocalWorlds,
  createWorldParamsSchema,
  worldSchema,
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
      inputSchema: z.object({
        world: z.string().describe("The world ID to query"),
        query: z.string().describe("SPARQL query string"),
      }),
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

  server.registerTool(
    "worlds_list",
    {
      description: "List all available worlds",
      inputSchema: z.object({
        page: z.number().default(1).describe("Page number"),
        pageSize: z.number().default(20).describe("Page size"),
      }),
    },
    async (args: { page: number; pageSize: number }) => {
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
      inputSchema: z.object({
        world: z.string().describe("The world ID to retrieve"),
      }),
    },
    async (args: { world: string }) => {
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
      inputSchema: createWorldParamsSchema,
    },
    async (args: { slug: string; label: string; description?: string | null }) => {
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
      inputSchema: z.object({
        world: z.string().describe("The world ID to import data into"),
        data: z.string().describe("RDF data in N-Triples or N-Quads format"),
      }),
    },
    async (args: { world: string; data: string }) => {
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
      inputSchema: z.object({
        world: z.string().describe("The world ID to export"),
      }),
    },
    async (args: { world: string }) => {
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
