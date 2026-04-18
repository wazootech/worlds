import { expandPathNamespace, type WorldsContext } from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";

/**
 * handleSearch executes a semantic search against the world.
 */
export async function handleSearch(
  appContext: WorldsContext,
  request: Request,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const namespace = body.namespace ?? body.source?.namespace ??
    authorized.namespaceId;
  const effectiveNs = expandPathNamespace(
    namespace,
    authorized.namespaceId,
  );

  const denied = assertNamespacePathAllowed(authorized, effectiveNs ?? "_");
  if (denied) return denied;

  const engine = getNamespacedEngine(appContext, effectiveNs);
  const results = await engine.search(body);
  return Response.json(results);
}
