import { Hono } from "jsr:@hono/hono";
import type { Context } from "jsr:@hono/hono";
import type {
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  SearchWorldsRequest,
  SparqlQueryRequest,
  UpdateWorldRequest,
  WorldsInterface,
} from "@wazoo/worlds-sdk";

import { worldsSparqlTool } from "@wazoo/worlds-ai-sdk/tools/sparql";
import { worldsSearchTool } from "@wazoo/worlds-ai-sdk/tools/search";
import { worldsListTool } from "@wazoo/worlds-ai-sdk/tools/list";
import { worldsGetTool } from "@wazoo/worlds-ai-sdk/tools/get";
import { worldsCreateTool } from "@wazoo/worlds-ai-sdk/tools/create";
import { worldsUpdateTool } from "@wazoo/worlds-ai-sdk/tools/update";
import { worldsDeleteTool } from "@wazoo/worlds-ai-sdk/tools/delete";
import { worldsImportTool } from "@wazoo/worlds-ai-sdk/tools/import";
import { worldsExportTool } from "@wazoo/worlds-ai-sdk/tools/export";

type McpToolOptions = {
  name: string;
  title: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
  readOnlyHint?: boolean;
  idempotentHint?: boolean;
};

type ToolDefinition = {
  tool: McpToolOptions;
  fn: (
    worlds: WorldsInterface,
    args: unknown,
  ) => Promise<unknown>;
};

const TOOLS: ToolDefinition[] = [
  {
    tool: {
      ...worldsSparqlTool,
      title: "SPARQL",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, a) => w.sparql(a as SparqlQueryRequest),
  },
  {
    tool: {
      ...worldsListTool,
      title: "List",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, a) => w.listWorlds(a as ListWorldsRequest),
  },
  {
    tool: {
      ...worldsGetTool,
      title: "Get",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, a) => w.getWorld(a as GetWorldRequest),
  },
  {
    tool: {
      ...worldsCreateTool,
      title: "Create",
    },
    fn: (w, a) => w.createWorld(a as CreateWorldRequest),
  },
  {
    tool: {
      ...worldsUpdateTool,
      title: "Update",
    },
    fn: (w, a) => w.updateWorld(a as UpdateWorldRequest),
  },
  {
    tool: {
      ...worldsDeleteTool,
      title: "Delete",
    },
    fn: (w, a) => w.deleteWorld(a as DeleteWorldRequest),
  },
  {
    tool: {
      ...worldsImportTool,
      title: "Import",
    },
    fn: (w, a) => w.import(a as ImportWorldRequest),
  },
  {
    tool: {
      ...worldsExportTool,
      title: "Export",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, a) => w.export(a as ExportWorldRequest),
  },
  {
    tool: {
      ...worldsSearchTool,
      title: "Search",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, a) => w.search(a as SearchWorldsRequest),
  },
];

type McpRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

type McpResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

/**
 * mcpRouter creates a router for the MCP server.
 */
export default (worlds: WorldsInterface) => {
  const app = new Hono();

  const handleMcpRequest = async (c: Context): Promise<Response> => {
    const request = c.req;
    const protocolVersionHeader = request.header("mcp-protocol-version");

    let mcpReq: McpRequest;
    try {
      mcpReq = await request.json();
    } catch {
      return c.text("Invalid JSON", 400);
    }

    const { method, params, id = null } = mcpReq;

    if (
      method !== "initialize" && protocolVersionHeader &&
      protocolVersionHeader !== "2024-11-05"
    ) {
      return c.json({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message:
            `Unsupported protocol version in header: ${protocolVersionHeader}`,
        },
      });
    }

    const response = (
      result?: unknown,
      error?: McpResponse["error"],
    ): McpResponse => ({
      jsonrpc: "2.0",
      id,
      ...(result !== undefined ? { result } : {}),
      ...(error ? { error } : {}),
    });

    try {
      switch (method) {
        case "initialize": {
          const clientVersion = params?.protocolVersion as string;
          if (clientVersion && clientVersion !== "2024-11-05") {
            return c.json(response(undefined, {
              code: -32603,
              message: `Unsupported protocol version: ${clientVersion}`,
            }));
          }

          return c.json(response({
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "worlds-server",
              version: "0.0.1",
            },
          }));
        }

        case "notifications/initialized":
          return c.body(null, { status: 204 });

        case "ping":
          return c.json(response({}));

        case "tools/list":
          return c.json(response({
            tools: TOOLS.map(({ tool }) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
            })),
          }));

        case "tools/call": {
          const name = params?.name as string;
          const args = params?.arguments as unknown;
          const definition = TOOLS.find((t) => t.tool.name === name);

          if (!definition) {
            return c.json(response(undefined, {
              code: -32601,
              message: `Tool not found: ${name}`,
            }));
          }

          try {
            const result = await definition.fn(worlds, args);
            return c.json(response({
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }));
          } catch (error) {
            return c.json(response({
              isError: true,
              content: [
                {
                  type: "text",
                  text: error instanceof Error ? error.message : String(error),
                },
              ],
            }));
          }
        }

        default:
          return c.json(response(undefined, {
            code: -32601,
            message: `Method not found: ${method}`,
          }));
      }
    } catch (error) {
      return c.json(response(undefined, {
        code: -32603,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  };

  app.post("/mcp", handleMcpRequest);
  app.get("/mcp", (c) => c.text("MCP Lite is up", 200));

  return app;
};

export type { McpToolOptions };
