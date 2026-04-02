import type { WorldsContext } from "@wazoo/worlds-sdk";
import { Router } from "@fartlabs/rt";

import worldsRouter from "./routes/worlds/route.ts";
import sparqlRouter from "./routes/worlds/sparql/route.ts";
import logsRouter from "./routes/worlds/logs/route.ts";
import searchRouter from "./routes/worlds/search/route.ts";
import mcpRouter from "./routes/mcp/route.ts";

const routes = [
  worldsRouter,
  sparqlRouter,
  logsRouter,
  searchRouter,
  mcpRouter,
];

/**
 * createServer creates a server from a WorldsContext.
 */
export function createServer(appContext: WorldsContext): Router {
  const app = new Router();
  for (const router of routes) {
    app.use(router(appContext));
  }

  return app;
}
