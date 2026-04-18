import { Router } from "@fartlabs/rt";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { handleListWorlds } from "./list.ts";
import { handleGetWorld } from "./get.ts";
import { handleCreateWorld } from "./create.ts";
import { handlePutWorld } from "./update.ts";
import { handleDeleteWorld } from "./delete.ts";
import { handleExport } from "./export.ts";
import { handleImport } from "./import.ts";
import { handleSearch } from "./search.ts";
import { handleSparql } from "./sparql.ts";

/**
 * rpcRouter creates a router for the Unified RPC API.
 */
export default (appContext: WorldsContext) => {
  return new Router()
    .post("/rpc", async (ctx) => {
      return await handleRpc(appContext, ctx);
    });
};

/**
 * handleRpc is the unified entry point for all Worlds RPC actions.
 */
export async function handleRpc(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const body = await ctx.request.json().catch(() => ({}));
  const { action, ...params } = body;

  if (!action) {
    return ErrorResponse.BadRequest("RPC action required in body");
  }

  // Construct a new Request with the consumed body (params only) to pass to modular handlers
  const reInjectedBody = { ...body };
  // @ts-ignore - internal
  delete reInjectedBody.action;

  console.log(
    `[RPC Dispatcher] Dispatching action=${action}, keys=${
      Object.keys(reInjectedBody).join(",")
    }`,
  );
  const request = new Request(ctx.request.url, {
    method: ctx.request.method,
    headers: ctx.request.headers,
    body: JSON.stringify(params),
  });

  try {
    // Dispatch to modular handlers using standardized (appContext, request) signature
    switch (action) {
      case "list":
        return await handleListWorlds(appContext, request);
      case "create":
        return await handleCreateWorld(appContext, request);
      case "get":
        return await handleGetWorld(appContext, request);
      case "update":
        return await handlePutWorld(appContext, request);
      case "delete":
        return await handleDeleteWorld(appContext, request);
      case "export":
        return await handleExport(appContext, request);
      case "import":
        return await handleImport(appContext, request);
      case "sparql":
        return await handleSparql(appContext, request);
      case "search":
        return await handleSearch(appContext, request);
      default:
        return ErrorResponse.BadRequest(`Unknown RPC action: ${action}`);
    }
  } catch (error) {
    console.error(`[RPC Error] ${action}:`, error);
    return ErrorResponse.InternalServerError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
