import type { WorldsContext } from "@wazoo/worlds-sdk";
import { Router } from "@fartlabs/rt";
import mcpRouter from "./routes/mcp/route.ts";
import worldsRouter from "./routes/rpc/route.ts";

/**
 * createServer creates a server from a WorldsContext.
 */
export function createServer(
  appContext: WorldsContext,
): Router {
  const app = new Router();

  // Connect Modular Worlds RPC Router
  app.use(worldsRouter(appContext));

  // Connect MCP router
  app.use(mcpRouter(appContext));

  return app;
}
