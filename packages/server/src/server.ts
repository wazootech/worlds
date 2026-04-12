import { LocalWorlds } from "@wazoo/worlds-sdk";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { Router } from "@fartlabs/rt";

import mcpRouter from "./routes/mcp/route.ts";
import {
  handleCreateWorld,
  handleDeleteWorld,
  handleExport,
  handleGetWorld,
  handleImport,
  handleListWorlds,
  handlePutWorld,
} from "./routes/worlds/route.ts";
import { handleSparql } from "./routes/worlds/sparql/route.ts";
import { handleSearch } from "./routes/worlds/search/route.ts";

/**
 * createServer creates a server from a WorldsContext.
 */
export async function createServer(
  appContext: WorldsContext,
): Promise<Router> {
  if (!appContext.engine) {
    appContext.engine = new LocalWorlds(appContext);
    await appContext.engine.init();
  }

  const app = new Router();

  // Define World RPC endpoints
  app.post("/worlds/rpc/get", (ctx) => handleGetWorld(appContext, ctx));
  app.post("/worlds/rpc/export", (ctx) => handleExport(appContext, ctx));
  app.post("/worlds/rpc/import", (ctx) => handleImport(appContext, ctx));
  app.post("/worlds/rpc/update", (ctx) => handlePutWorld(appContext, ctx));
  app.post("/worlds/rpc/delete", (ctx) => handleDeleteWorld(appContext, ctx));
  app.post("/worlds/rpc/sparql", (ctx) => handleSparql(appContext, ctx));
  app.post("/worlds/rpc/search", (ctx) => handleSearch(appContext, ctx));

  // Define World Management endpoints
  app.get("/worlds", (ctx) => handleListWorlds(appContext, ctx));
  app.post("/worlds", (ctx) => handleCreateWorld(appContext, ctx));

  // Connect MCP router
  app.use(mcpRouter(appContext));

  return app;
}
