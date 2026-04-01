import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { LocalWorlds } from "@wazoo/worlds-sdk";
import type { SourceInput } from "@wazoo/worlds-ai-sdk/options";

import {
  executeSparql,
  executeSparqlInputSchema,
  executeSparqlOutputSchema,
  executeSparqlTool,
} from "@wazoo/worlds-ai-sdk/tools/sparql";
import {
  searchEntities,
  searchEntitiesInputSchema,
  searchEntitiesOutputSchema,
  searchEntitiesTool,
} from "@wazoo/worlds-ai-sdk/tools/search";
import {
  listWorlds,
  worldsListInputSchema,
  worldsListOutputSchema,
  worldsListTool,
} from "@wazoo/worlds-ai-sdk/tools/list";
import {
  getWorld,
  worldsGetInputSchema,
  worldsGetOutputSchema,
  worldsGetTool,
} from "@wazoo/worlds-ai-sdk/tools/get";
import {
  createWorld,
  worldsCreateInputSchema,
  worldsCreateOutputSchema,
  worldsCreateTool,
} from "@wazoo/worlds-ai-sdk/tools/create";
import {
  importWorld,
  worldsImportInputSchema,
  worldsImportOutputSchema,
  worldsImportTool,
} from "@wazoo/worlds-ai-sdk/tools/import";
import {
  exportWorld,
  worldsExportInputSchema,
  worldsExportOutputSchema,
  worldsExportTool,
} from "@wazoo/worlds-ai-sdk/tools/export";
// Discover is now accomplished via Search
import {
  defaultDisambiguate,
  disambiguateEntitiesInputSchema,
  disambiguateEntitiesOutputSchema,
  disambiguateEntitiesTool,
} from "@wazoo/worlds-ai-sdk/tools/match";
import {
  generateIriInputSchema,
  generateIriOutputSchema,
  generateIriTool,
} from "@wazoo/worlds-ai-sdk/tools/generate";
import {
  validateRdf,
  validateRdfInputSchema,
  validateRdfOutputSchema,
  validateRdfTool,
} from "@wazoo/worlds-ai-sdk/tools/validate";
import {
  listLogs,
  listLogsInputSchema,
  listLogsOutputSchema,
  logsTool,
} from "@wazoo/worlds-ai-sdk/tools/logs";

import type { ExecuteSparqlInput } from "@wazoo/worlds-ai-sdk/tools/sparql/schema";
import type { SearchEntitiesInput } from "@wazoo/worlds-ai-sdk/tools/search/schema";
import type { WorldsListInput } from "@wazoo/worlds-ai-sdk/tools/list/schema";
import type { WorldsGetInput } from "@wazoo/worlds-ai-sdk/tools/get/schema";
import type { WorldsCreateInput } from "@wazoo/worlds-ai-sdk/tools/create/schema";
import type { WorldsImportInput } from "@wazoo/worlds-ai-sdk/tools/import/schema";
import type { WorldsExportInput } from "@wazoo/worlds-ai-sdk/tools/export/schema";
import type { DisambiguateEntitiesInput } from "@wazoo/worlds-ai-sdk/tools/match/schema";
import type { GenerateIriInput } from "@wazoo/worlds-ai-sdk/tools/generate/schema";
import type { ValidateRdfInput } from "@wazoo/worlds-ai-sdk/tools/validate/schema";
import type { ListLogsInput } from "@wazoo/worlds-ai-sdk/tools/logs/schema";

/** mcpRouter defines the MCP server route and registers tools. @see https://skills.sh/anthropics/skills/mcp-builder */
export default (appContext: WorldsContext) => {
  const worlds = new LocalWorlds(appContext);

  const sources: SourceInput[] = [];
  const generateIri = (_ref?: string) =>
    `https://wazoo.dev/.well-known/genid/${crypto.randomUUID()}`;

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
      outputSchema: executeSparqlOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: ExecuteSparqlInput) => {
      try {
        const result = await executeSparql(worlds, sources, args);
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
      title: "List Worlds",
      description: worldsListTool.description,
      inputSchema: worldsListInputSchema,
      outputSchema: worldsListOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: WorldsListInput) => {
      try {
        const result = await listWorlds(worlds, args);
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
      title: "Get World",
      description: worldsGetTool.description,
      inputSchema: worldsGetInputSchema,
      outputSchema: worldsGetOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: WorldsGetInput) => {
      try {
        const result = await getWorld(worlds, args);
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
      title: "Create World",
      description: worldsCreateTool.description,
      inputSchema: worldsCreateInputSchema,
      outputSchema: worldsCreateOutputSchema,
      idempotentHint: false,
    },
    async (args: WorldsCreateInput) => {
      try {
        const result = await createWorld(worlds, args);
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
    worldsImportTool.name,
    {
      title: "Import RDF",
      description: worldsImportTool.description,
      inputSchema: worldsImportInputSchema,
      outputSchema: worldsImportOutputSchema,
    },
    async (args: WorldsImportInput) => {
      try {
        const result = await importWorld(worlds, args);
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
      title: "Export RDF",
      description: worldsExportTool.description,
      inputSchema: worldsExportInputSchema,
      outputSchema: worldsExportOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (input: WorldsExportInput) => {
      try {
        const result = await exportWorld(worlds, input);
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
    searchEntitiesTool.name,
    {
      title: "Search Entities",
      description: searchEntitiesTool.description,
      inputSchema: searchEntitiesInputSchema,
      outputSchema: searchEntitiesOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: SearchEntitiesInput) => {
      try {
        const result = await searchEntities(worlds, args);
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
    disambiguateEntitiesTool.name,
    {
      title: "Disambiguate Entities",
      description: disambiguateEntitiesTool.description,
      inputSchema: disambiguateEntitiesInputSchema,
      outputSchema: disambiguateEntitiesOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    (args: DisambiguateEntitiesInput) => {
      try {
        const result = defaultDisambiguate(args);
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
              text: `Disambiguation Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    generateIriTool.name,
    {
      title: "Generate IRI",
      description: generateIriTool.description,
      inputSchema: generateIriInputSchema,
      outputSchema: generateIriOutputSchema,
      idempotentHint: true,
    },
    (args: GenerateIriInput) => {
      try {
        const result = { iri: generateIri(args.referenceText) };
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
              text: `IRI Generation Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    validateRdfTool.name,
    {
      title: "Validate RDF",
      description: validateRdfTool.description,
      inputSchema: validateRdfInputSchema,
      outputSchema: validateRdfOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: ValidateRdfInput) => {
      try {
        const result = await validateRdf(args, { worlds, sources });
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
              text: `Validation Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    logsTool.name,
    {
      title: "World Logs",
      description: logsTool.description,
      inputSchema: listLogsInputSchema,
      outputSchema: listLogsOutputSchema,
      readOnlyHint: true,
      idempotentHint: true,
    },
    async (args: ListLogsInput) => {
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
