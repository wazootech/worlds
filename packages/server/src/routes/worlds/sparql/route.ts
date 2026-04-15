import { Router } from "@fartlabs/rt";
import type { WorldsContentType, WorldsContext } from "@wazoo/worlds-sdk";
import { expandPathNamespace } from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
import { negotiateSerialization } from "#/utils/http/negotiation.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";

/**
 * sparqlRouter creates a router for the SPARQL API.
 */
export default (appContext: WorldsContext) => {
  return new Router()
    .post(
      "/worlds/rpc/sparql",
      async (ctx) => {
        return await handleSparql(appContext, ctx);
      },
    );
};

export async function handleSparql(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  try {
    const input = await ctx.request.json();
    const { query } = input;

    // Resolve effective namespace from input/authorized context instead of path
    const namespace = input.namespace ?? input.source?.namespace ??
      authorized.namespaceId;
    const effectiveNs = expandPathNamespace(
      namespace,
      authorized.namespaceId,
    );
    const denied = assertNamespacePathAllowed(authorized, effectiveNs);
    if (denied) return denied;

    const engine = getNamespacedEngine(appContext, effectiveNs);

    if (!query) {
      const serialization = negotiateSerialization(ctx.request);
      const description = await engine.getServiceDescription({
        ...input,
        endpointUrl: ctx.request.url,
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
  } catch (error) {
    return ErrorResponse.BadRequest(
      error instanceof Error ? error.message : "Query/update failed",
    );
  }
}
