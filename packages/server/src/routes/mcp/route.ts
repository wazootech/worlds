import { McpServer } from "npm:@modelcontextprotocol/sdk@1.29.0";
import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { LocalWorlds } from "@wazoo/worlds-sdk";

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

  server.setRequestHandler(
    { method: "tools/list" },
    async () => {
      return {
        tools: [
          {
            name: "worlds_query",
            description: "Query a Worlds knowledge graph using SPARQL",
            inputSchema: {
              type: "object",
              properties: {
                world: {
                  type: "string",
                  description: "The world ID to query",
                },
                query: {
                  type: "string",
                  description: "SPARQL query string",
                },
              },
              required: ["world", "query"],
            },
          },
          {
            name: "worlds_list",
            description: "List all available worlds",
            inputSchema: {
              type: "object",
              properties: {
                page: {
                  type: "number",
                  description: "Page number",
                  default: 1,
                },
                pageSize: {
                  type: "number",
                  description: "Page size",
                  default: 20,
                },
              },
            },
          },
          {
            name: "worlds_get",
            description: "Get a world by ID",
            inputSchema: {
              type: "object",
              properties: {
                world: {
                  type: "string",
                  description: "The world ID to retrieve",
                },
              },
              required: ["world"],
            },
          },
          {
            name: "worlds_create",
            description: "Create a new world",
            inputSchema: {
              type: "object",
              properties: {
                worldId: {
                  type: "string",
                  description: "ID for the new world",
                },
                name: {
                  type: "string",
                  description: "Name of the world",
                },
              },
              required: ["worldId", "name"],
            },
          },
          {
            name: "worlds_import",
            description: "Import RDF data into a world",
            inputSchema: {
              type: "object",
              properties: {
                world: {
                  type: "string",
                  description: "The world ID to import data into",
                },
                data: {
                  type: "string",
                  description: "RDF data in N-Triples or N-Quads format",
                },
              },
              required: ["world", "data"],
            },
          },
          {
            name: "worlds_export",
            description: "Export a world as RDF data",
            inputSchema: {
              type: "object",
              properties: {
                world: {
                  type: "string",
                  description: "The world ID to export",
                },
              },
              required: ["world"],
            },
          },
        ],
      };
    },
  );

  server.setRequestHandler(
    { method: "tools/call" },
    async (request: { name: string; arguments: Record<string, unknown> }) => {
      const { name, arguments: args } = request;

      try {
        switch (name) {
          case "worlds_query": {
            const result = await worlds.sparql(args.world as string, args.query as string);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "worlds_list": {
            const result = await worlds.list({
              page: (args.page as number) ?? 1,
              pageSize: (args.pageSize as number) ?? 20,
            });
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "worlds_get": {
            const world = await worlds.get(args.world as string);
            if (!world) {
              return {
                content: [
                  {
                    type: "text",
                    text: "World not found",
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(world, null, 2),
                },
              ],
            };
          }

          case "worlds_create": {
            const world = await worlds.create({
              slug: args.worldId as string,
              label: args.name as string,
            });
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(world, null, 2),
                },
              ],
            };
          }

          case "worlds_import": {
            const dataStr = args.data as string;
            await worlds.import(
              args.world as string,
              dataStr,
              { contentType: "application/n-triples" },
            );
            return {
              content: [
                {
                  type: "text",
                  text: "Data imported successfully",
                },
              ],
            };
          }

          case "worlds_export": {
            const buffer = await worlds.export(args.world as string, {
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
          }

          default:
            return {
              content: [
                {
                  type: "text",
                  text: `Unknown tool: ${name}`,
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.setRequestHandler(
    { method: "resources/list" },
    async () => {
      return {
        resources: [],
      };
    },
  );

  server.setRequestHandler(
    { method: "resources/read" },
    async () => {
      return {
        contents: [],
      };
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
