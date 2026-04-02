import { LocalWorlds } from "@wazoo/worlds-sdk";
import type { WorldsContext, WorldsInterface } from "@wazoo/worlds-sdk";
import { Router } from "@fartlabs/rt";

import worldsRouter from "./routes/worlds/route.ts";
import sparqlRouter from "./routes/worlds/sparql/route.ts";
import logsRouter from "./routes/worlds/logs/route.ts";
import searchRouter from "./routes/worlds/search/route.ts";
import mcpRouter from "./routes/mcp/route.ts";

/**
 * createServer creates a server from a WorldsContext.
 */
export async function createServer(
  appContext: WorldsContext,
  worlds?: WorldsInterface,
): Promise<Router> {
  const engine = worlds ?? new LocalWorlds(appContext);
  await engine.init();
  const app = new Router();

  app.use(worldsRouter(engine, appContext));
  app.use(sparqlRouter(engine, appContext));
  app.use(logsRouter(engine, appContext));
  app.use(searchRouter(engine, appContext));
  app.use(mcpRouter(engine, appContext));

  return app;
}
