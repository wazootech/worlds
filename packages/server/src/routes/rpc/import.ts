import {
  expandPathNamespace,
  resolveSource,
  type WorldsContentType,
  type WorldsContext,
} from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";

/**
 * handleImport loads data into the store.
 */
export async function handleImport(
  appContext: WorldsContext,
  request: Request,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  if (!body.source) {
    return ErrorResponse.BadRequest("Resource source required in body");
  }

  const sourceRaw = body.source;
  const source = resolveSource(sourceRaw, {
    namespace: authorized.namespaceId ?? undefined,
  });
  const effectiveNs = expandPathNamespace(
    source.namespace ?? null,
    authorized.namespaceId,
  );

  const denied = assertNamespacePathAllowed(authorized, effectiveNs ?? "_");
  if (denied) return denied;

  const { data, contentType } = body as {
    data: string;
    contentType?: string;
  };

  if (!data) {
    return ErrorResponse.BadRequest("Data required for import");
  }

  const engine = getNamespacedEngine(appContext, effectiveNs);
  await engine.import({
    source,
    data,
    contentType: contentType as WorldsContentType,
  });

  return new Response(null, { status: 204 });
}
