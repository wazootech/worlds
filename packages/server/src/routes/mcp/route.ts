import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { LocalWorlds } from "@wazoo/worlds-sdk";
import type { SourceInput } from "@wazoo/worlds-ai-sdk/options";

import {
  sparql,
  worldsSparqlInputSchema,
  worldsSparqlOutputSchema,
  worldsSparqlTool,
} from "@wazoo/worlds-ai-sdk/tools/sparql";
import {
  search,
  worldsSearchInputSchema,
  worldsSearchOutputSchema,
  worldsSearchTool,
} from "@wazoo/worlds-ai-sdk/tools/search";
import {
  list,
  worldsListInputSchema,
  worldsListOutputSchema,
  worldsListTool,
} from "@wazoo/worlds-ai-sdk/tools/list";
import {
  get,
  worldsGetInputSchema,
  worldsGetOutputSchema,
  worldsGetTool,
} from "@wazoo/worlds-ai-sdk/tools/get";
import {
  create,
  worldsCreateInputSchema,
  worldsCreateOutputSchema,
  worldsCreateTool,
} from "@wazoo/worlds-ai-sdk/tools/create";
import {
  update,
  worldsUpdateInputSchema,
  worldsUpdateOutputSchema,
  worldsUpdateTool,
} from "@wazoo/worlds-ai-sdk/tools/update";
import {
  deleteWorld,
  worldsDeleteInputSchema,
  worldsDeleteOutputSchema,
  worldsDeleteTool,
} from "@wazoo/worlds-ai-sdk/tools/delete";
import {
  importData,
  worldsImportInputSchema,
  worldsImportOutputSchema,
  worldsImportTool,
} from "@wazoo/worlds-ai-sdk/tools/import";
import {
  exportData,
  worldsExportInputSchema,
  worldsExportOutputSchema,
  worldsExportTool,
} from "@wazoo/worlds-ai-sdk/tools/export";
import {
  listLogs,
  worldsLogsInputSchema,
  worldsLogsOutputSchema,
  worldsLogsTool,
} from "@wazoo/worlds-ai-sdk/tools/logs";

import type { WorldsSparqlInput } from "@wazoo/worlds-ai-sdk/tools/sparql/schema";
import type { WorldsSearchInput } from "@wazoo/worlds-ai-sdk/tools/search/schema";
import type { WorldsListInput } from "@wazoo/worlds-ai-sdk/tools/list/schema";
import type { WorldsGetInput } from "@wazoo/worlds-ai-sdk/tools/get/schema";
import type { WorldsCreateInput } from "@wazoo/worlds-ai-sdk/tools/create/schema";
import type { WorldsUpdateInput } from "@wazoo/worlds-ai-sdk/tools/update/schema";
import type { WorldsDeleteInput } from "@wazoo/worlds-ai-sdk/tools/delete/schema";
import type { WorldsImportInput } from "@wazoo/worlds-ai-sdk/tools/import/schema";
import type { WorldsExportInput } from "@wazoo/worlds-ai-sdk/tools/export/schema";
import type { WorldsLogsInput } from "@wazoo/worlds-ai-sdk/tools/logs/schema";

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

  server.registerTool(
    worldsSparqlTool.name,
    {
      title: "SPARQL",
      description: worldsSparqlTool.description,
      inputSchema: worldsSparqlInputSchema,
      outputSchema: worldsSparqlOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: WorldsSparqlInput) => {
      try {
        const result = await sparql(worlds, sources, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `SPARQL Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    worldsListTool.name,
    {
      title: "List",
      description: worldsListTool.description,
      inputSchema: worldsListInputSchema,
      outputSchema: worldsListOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: WorldsListInput) => {
      try {
        const result = await list(worlds, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `List Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    worldsGetTool.name,
    {
      title: "Get",
      description: worldsGetTool.description,
      inputSchema: worldsGetInputSchema,
      outputSchema: worldsGetOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: WorldsGetInput) => {
      try {
        const result = await get(worlds, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Get Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    worldsCreateTool.name,
    {
      title: "Create",
      description: worldsCreateTool.description,
      inputSchema: worldsCreateInputSchema,
      outputSchema: worldsCreateOutputSchema,
      idempotentHint: false,
    },
    async (args: WorldsCreateInput) => {
      try {
        const result = await create(worlds, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Create Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    worldsUpdateTool.name,
    {
      title: "Update",
      description: worldsUpdateTool.description,
      inputSchema: worldsUpdateInputSchema,
      outputSchema: worldsUpdateOutputSchema,
      idempotentHint: false,
    },
    async (args: WorldsUpdateInput) => {
      try {
        const result = await update(worlds, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Update Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    worldsDeleteTool.name,
    {
      title: "Delete",
      description: worldsDeleteTool.description,
      inputSchema: worldsDeleteInputSchema,
      outputSchema: worldsDeleteOutputSchema,
      idempotentHint: false,
    },
    async (args: WorldsDeleteInput) => {
      try {
        const result = await deleteWorld(worlds, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Delete Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    worldsImportTool.name,
    {
      title: "Import",
      description: worldsImportTool.description,
      inputSchema: worldsImportInputSchema,
      outputSchema: worldsImportOutputSchema,
    },
    async (args: WorldsImportInput) => {
      try {
        const result = await importData(worlds, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Import Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    worldsExportTool.name,
    {
      title: "Export",
      description: worldsExportTool.description,
      inputSchema: worldsExportInputSchema,
      outputSchema: worldsExportOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (input: WorldsExportInput) => {
      try {
        const result = await exportData(worlds, input);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Export Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    worldsSearchTool.name,
    {
      title: "Search",
      description: worldsSearchTool.description,
      inputSchema: worldsSearchInputSchema,
      outputSchema: worldsSearchOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: WorldsSearchInput) => {
      try {
        const result = await search(worlds, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Search Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    worldsLogsTool.name,
    {
      title: "Logs",
      description: worldsLogsTool.description,
      inputSchema: worldsLogsInputSchema,
      outputSchema: worldsLogsOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: WorldsLogsInput) => {
      try {
        const result = await listLogs(worlds, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Logs Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
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
