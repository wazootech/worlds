import {
  expandPathNamespace,
  type WorldsContentType,
  type WorldsContext,
} from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
import { negotiateSerialization } from "#/utils/http/negotiation.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";

/**
 * handleSparql executes a SPARQL query against the world.
 */
export async function handleSparql(
  appContext: WorldsContext,
  request: Request,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const input = await request.json().catch(() => ({}));
  const { query } = input;

  const namespace = input.namespace ?? input.source?.namespace ??
    authorized.namespaceId;
  const effectiveNs = expandPathNamespace(
    namespace,
    authorized.namespaceId,
  );

  const denied = assertNamespacePathAllowed(authorized, effectiveNs ?? "_");
  if (denied) return denied;

  const engine = getNamespacedEngine(appContext, effectiveNs);

  if (!query) {
    const serialization = negotiateSerialization(request);
    const description = await engine.getServiceDescription({
      ...input,
      endpointUrl: request.url,
      contentType: serialization.contentType as WorldsContentType,
    });
    return new Response(description, {
      headers: { "Content-Type": serialization.contentType },
    });
  }

  const result = await engine.sparql(input);

  if (result === null) return new Response(null, { status: 204 });
  return Response.json(result, {
    headers: { "Content-Type": "application/sparql-results+json" },
  });
}
