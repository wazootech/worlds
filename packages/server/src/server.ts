import type { WorldsRegistry } from "@wazoo/worlds-sdk";
import { Router } from "@fartlabs/rt";
import mcpRouter from "./routes/mcp/route.ts";
import worldsRouter from "./routes/rpc/route.ts";

/**
 * createServer creates a server from a WorldsRegistry.
 */
export function createServer(
  registry: WorldsRegistry,
): Router {
  const app = new Router();

  // Connect Modular Worlds RPC Router
  app.use(worldsRouter(registry));

  // Connect MCP router
  app.use(mcpRouter(registry));

  return app;
}
