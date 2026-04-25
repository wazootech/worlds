import type { WorldsInterface } from "@wazoo/worlds-sdk";
import { Router } from "@fartlabs/rt";
import mcpRouter from "./routes/mcp/route.ts";
import worldsRouter from "./routes/rpc/route.ts";

/**
 * createServer creates a server from a WorldsInterface instance.
 */
export function createServer(
  worlds: WorldsInterface,
): Router {
  const app = new Router();

  // Connect Modular Worlds RPC Router
  app.use(worldsRouter(worlds));

  // Connect MCP router
  app.use(mcpRouter(worlds));

  return app;
}
