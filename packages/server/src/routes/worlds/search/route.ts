import { Router } from "@fartlabs/rt";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { expandPathNamespace } from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";

/**
 * searchRouter creates a router for the World Search API.
 */
export default (appContext: WorldsContext) => {
  return new Router()
    .post(
      "/worlds/rpc/search",
      async (ctx) => {
        return await handleSearch(appContext, ctx);
      },
    );
};

export async function handleSearch(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  try {
    const body = await ctx.request.json();
    const namespace = body.namespace ?? body.source?.namespace ??
      authorized.namespaceId;
    const effectiveNs = expandPathNamespace(
      namespace,
      authorized.namespaceId,
    );
    const denied = assertNamespacePathAllowed(authorized, effectiveNs);
    if (denied) return denied;

    const engine = getNamespacedEngine(appContext, effectiveNs);
    const results = await engine.search(body);
    return Response.json(results);
  } catch (error) {
    return ErrorResponse.BadRequest(
      error instanceof Error ? error.message : "Search failed",
    );
  }
}
