import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
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
  WorldsRegistry,
} from "@wazoo/worlds-sdk";
import type { SourceInput } from "@wazoo/worlds-ai-sdk/types";

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
    registry: WorldsRegistry,
    args: any,
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
    fn: (r, a) => r.sparql(a as SparqlQueryRequest),
  },
  {
    tool: {
      ...worldsListTool,
      title: "List",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (r, a) => r.listWorlds(a as ListWorldsRequest),
  },
  {
    tool: {
      ...worldsGetTool,
      title: "Get",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (r, a) => r.getWorld(a as GetWorldRequest),
  },
  {
    tool: {
      ...worldsCreateTool,
      title: "Create",
    },
    fn: (r, a) => r.createWorld(a as CreateWorldRequest),
  },
  {
    tool: {
      ...worldsUpdateTool,
      title: "Update",
    },
    fn: (r, a) => r.updateWorld(a as UpdateWorldRequest),
  },
  {
    tool: {
      ...worldsDeleteTool,
      title: "Delete",
    },
    fn: (r, a) => r.deleteWorld(a as DeleteWorldRequest),
  },
  {
    tool: {
      ...worldsImportTool,
      title: "Import",
    },
    fn: (r, a) => r.import(a as ImportWorldRequest),
  },
  {
    tool: {
      ...worldsExportTool,
      title: "Export",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (r, a) => r.export(a as ExportWorldRequest),
  },
  {
    tool: {
      ...worldsSearchTool,
      title: "Search",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (r, a) => r.search(a as SearchWorldsRequest),
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
export default (registry: WorldsRegistry) => {
  const handleMcpRequest = async (request: Request): Promise<Response> => {
    const authorized = await authorizeRequest(registry, request);
    if (!authorized.admin) {
      return new Response("Unauthorized", { status: 401 });
    }

    const protocolVersionHeader = request.headers.get("mcp-protocol-version");

    let mcpReq: McpRequest;
    try {
      mcpReq = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { method, params, id = null } = mcpReq;

    if (
      method !== "initialize" && protocolVersionHeader &&
      protocolVersionHeader !== "2024-11-05"
    ) {
      return Response.json({
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
            return Response.json(response(undefined, {
              code: -32603,
              message: `Unsupported protocol version: ${clientVersion}`,
            }));
          }

          return Response.json(response({
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
          return new Response(null, { status: 204 });

        case "ping":
          return Response.json(response({}));

        case "tools/list":
          return Response.json(response({
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
            return Response.json(response(undefined, {
              code: -32601,
              message: `Tool not found: ${name}`,
            }));
          }

          try {
            const result = await definition.fn(registry, args);
            return Response.json(response({
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }));
          } catch (error) {
            return Response.json(response({
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
          return Response.json(response(undefined, {
            code: -32601,
            message: `Method not found: ${method}`,
          }));
      }
    } catch (error) {
      return Response.json(response(undefined, {
        code: -32603,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  };

  const mcpRouter = new Router();
  mcpRouter.post("/mcp", (ctx) => handleMcpRequest(ctx.request));
  mcpRouter.get("/mcp", () => new Response("MCP Lite is up", { status: 200 }));

  return mcpRouter;
};

export type { McpToolOptions };
