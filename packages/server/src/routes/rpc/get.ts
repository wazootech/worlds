import {
  expandPathNamespace,
  resolveSource,
  type WorldsContext,
} from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
import { handleETagRequest } from "#/utils/http/etag.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";

/**
 * handleGetWorld retrieves a specific world's metadata.
 */
export async function handleGetWorld(
  appContext: WorldsContext,
  request: Request,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const sourceRaw = body.source;
  if (!sourceRaw) {
    return ErrorResponse.BadRequest("Resource source required in body");
  }

  const source = resolveSource(sourceRaw, {
    namespace: authorized.namespaceId ?? undefined,
  });
  const effectiveNs = expandPathNamespace(
    source.namespace ?? null,
    authorized.namespaceId,
  );

  const denied = assertNamespacePathAllowed(authorized, effectiveNs ?? "_");
  if (denied) return denied;

  const engine = getNamespacedEngine(appContext, effectiveNs);
  const world = await engine.get({ source });
  if (!world) {
    return ErrorResponse.NotFound("World not found");
  }

  return await handleETagRequest(request, Response.json(world));
}
