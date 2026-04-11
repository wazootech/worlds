import { LocalWorlds } from "@wazoo/worlds-sdk";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { Router } from "@fartlabs/rt";

import worldsRouter from "./routes/worlds/route.ts";
import sparqlRouter from "./routes/worlds/sparql/route.ts";
import searchRouter from "./routes/worlds/search/route.ts";
import mcpRouter from "./routes/mcp/route.ts";

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

  app.use(worldsRouter(appContext));
  app.use(sparqlRouter(appContext));
  app.use(searchRouter(appContext));
  app.use(mcpRouter(appContext));

  return app;
}
