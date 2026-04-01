import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { LocalWorlds } from "@wazoo/worlds-sdk";
import type { SourceInput } from "@wazoo/worlds-ai-sdk/options";

import type { WorldsSparqlInput } from "@wazoo/worlds-ai-sdk/tools/sparql";
import { sparql, worldsSparqlTool } from "@wazoo/worlds-ai-sdk/tools/sparql";
import type { WorldsSearchInput } from "@wazoo/worlds-ai-sdk/tools/search";
import { search, worldsSearchTool } from "@wazoo/worlds-ai-sdk/tools/search";
import type { WorldsListInput } from "@wazoo/worlds-ai-sdk/tools/list";
import { list, worldsListTool } from "@wazoo/worlds-ai-sdk/tools/list";
import type { WorldsGetInput } from "@wazoo/worlds-ai-sdk/tools/get";
import { get, worldsGetTool } from "@wazoo/worlds-ai-sdk/tools/get";
import type { WorldsCreateInput } from "@wazoo/worlds-ai-sdk/tools/create";
import { create, worldsCreateTool } from "@wazoo/worlds-ai-sdk/tools/create";
import type { WorldsUpdateInput } from "@wazoo/worlds-ai-sdk/tools/update";
import { update, worldsUpdateTool } from "@wazoo/worlds-ai-sdk/tools/update";
import type { WorldsDeleteInput } from "@wazoo/worlds-ai-sdk/tools/delete";
import { deleteWorld, worldsDeleteTool } from "@wazoo/worlds-ai-sdk/tools/delete";
import type { WorldsImportInput } from "@wazoo/worlds-ai-sdk/tools/import";
import { importData, worldsImportTool } from "@wazoo/worlds-ai-sdk/tools/import";
import type { WorldsExportInput } from "@wazoo/worlds-ai-sdk/tools/export";
import { exportData, worldsExportTool } from "@wazoo/worlds-ai-sdk/tools/export";
import type { WorldsLogsInput } from "@wazoo/worlds-ai-sdk/tools/logs";
import { listLogs, worldsLogsTool } from "@wazoo/worlds-ai-sdk/tools/logs";

import type { CreateToolsOptions } from "@wazoo/worlds-ai-sdk/options";
import type { McpServer as McpServerType } from "@modelcontextprotocol/sdk/server/mcp.js";

type McpToolOptions = {
  name: string;
  title: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
  readOnlyHint?: boolean;
  idempotentHint?: boolean;
};

function registerMcpTool(
  server: McpServerType,
  options: McpToolOptions,
  execute: (args: unknown) => Promise<unknown>,
): void {
  server.registerTool(
    options.name,
    {
      title: options.title,
      description: options.description,
      inputSchema: options.inputSchema,
      outputSchema: options.outputSchema,
      readOnlyHint: options.readOnlyHint,
      idempotentHint: options.idempotentHint,
    },
    async (args: unknown) => {
      try {
        const result = await execute(args);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `${options.title} Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );
}

type ToolDefinition = {
  tool: McpToolOptions;
  fn: (worlds: CreateToolsOptions["worlds"], sources: CreateToolsOptions["sources"], args: unknown) => Promise<unknown>;
};

const TOOLS: ToolDefinition[] = [
  {
    tool: {
      ...worldsSparqlTool,
      title: "SPARQL",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, s, a) => sparql(w, s, a as WorldsSparqlInput),
  },
  {
    tool: {
      ...worldsListTool,
      title: "List",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, _s, a) => list(w, a as WorldsListInput),
  },
  {
    tool: {
      ...worldsGetTool,
      title: "Get",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, _s, a) => get(w, a as WorldsGetInput),
  },
  {
    tool: {
      ...worldsCreateTool,
      title: "Create",
    },
    fn: (w, _s, a) => create(w, a as WorldsCreateInput),
  },
  {
    tool: {
      ...worldsUpdateTool,
      title: "Update",
    },
    fn: (w, _s, a) => update(w, a as WorldsUpdateInput),
  },
  {
    tool: {
      ...worldsDeleteTool,
      title: "Delete",
    },
    fn: (w, _s, a) => deleteWorld(w, a as WorldsDeleteInput),
  },
  {
    tool: {
      ...worldsImportTool,
      title: "Import",
    },
    fn: (w, _s, a) => importData(w, a as WorldsImportInput),
  },
  {
    tool: {
      ...worldsExportTool,
      title: "Export",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, _s, a) => exportData(w, a as WorldsExportInput),
  },
  {
    tool: {
      ...worldsSearchTool,
      title: "Search",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, _s, a) => search(w, a as WorldsSearchInput),
  },
  {
    tool: {
      ...worldsLogsTool,
      title: "Logs",
      readOnlyHint: true,
      idempotentHint: true,
    },
    fn: (w, _s, a) => listLogs(w, a as WorldsLogsInput),
  },
];

/** mcpRouter defines the MCP server route and registers tools. @see https://skills.sh/anthropics/skills/mcp-builder */
export default (appContext: WorldsContext) => {
  const worlds = new LocalWorlds(appContext);

  const sources: SourceInput[] = [];

  const server = new McpServer({
    name: "worlds-server",
    version: "0.0.1",
  }, {
    capabilities: {
      tools: {},
      resources: {},
    },
  });

  for (const { tool, fn } of TOOLS) {
    registerMcpTool(server, tool, (args) => fn(worlds, sources, args));
  }

  const mcpRouter = new Router();

  const handleMcpRequest = (request: Request): Response => {
    const authorized = authorizeRequest(appContext, request);
    if (!authorized.admin) {
      return new Response("Unauthorized", { status: 401 });
    }
    return server.server.fetch(request);
  };

  mcpRouter.post("/mcp", (ctx) => handleMcpRequest(ctx.request));
  mcpRouter.get("/mcp", (ctx) => handleMcpRequest(ctx.request));

  return mcpRouter;
};

export type { McpToolOptions };
