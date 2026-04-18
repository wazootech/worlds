import {
  expandPathNamespace,
  resolveSource,
  type WorldsContentType,
  type WorldsContext,
} from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
import { handleETagRequest } from "#/utils/http/etag.ts";
import { negotiateSerialization } from "#/utils/http/negotiation.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";

/**
 * handleExport retrieves world data in the requested format.
 */
export async function handleExport(
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

  const { contentType: contentTypeParam } = body as {
    contentType?: string;
  };

  let serialization;
  if (contentTypeParam) {
    serialization = {
      contentType: contentTypeParam as WorldsContentType,
    };
  } else {
    const negotiated = negotiateSerialization(
      request,
      "application/n-quads",
    );
    serialization = {
      contentType: negotiated.contentType as WorldsContentType,
    };
  }

  const engine = getNamespacedEngine(appContext, effectiveNs);
  const buffer = await engine.export({
    source,
    contentType: serialization.contentType,
  });

  return await handleETagRequest(
    request,
    new Response(buffer, {
      headers: { "Content-Type": serialization.contentType as string },
    }),
  );
}
