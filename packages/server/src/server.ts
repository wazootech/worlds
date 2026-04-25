import type { WorldsInterface } from "@wazoo/worlds-sdk";
import { Hono } from "@hono/hono";
import mcpRouter from "./routes/mcp/route.ts";
import worldsRouter from "./routes/rpc/route.ts";

/**
 * createServer creates a server from a WorldsInterface instance.
 */
export function createServer(
  worlds: WorldsInterface,
): Hono {
  const app = new Hono();

  // Connect Modular Worlds RPC Router
  app.route("/", worldsRouter(worlds));

  // Connect MCP router
  app.route("/", mcpRouter(worlds));

  return app;
}
