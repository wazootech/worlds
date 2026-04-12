import { Router } from "@fartlabs/rt";
import type { WorldsContentType, WorldsContext } from "@wazoo/worlds-sdk";
import {
  DEFAULT_NAMESPACE,
  expandPathNamespace,
  mergeSparqlInputFromPath,
} from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
import { negotiateSerialization } from "#/utils/http/negotiation.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";

function pathGroup(
  params: URLPatternResult | undefined,
  name: string,
): string | undefined {
  const g = params?.pathname.groups as
    | Record<string, string | undefined>
    | undefined;
  return g?.[name];
}

/**
 * sparqlRouter creates a router for the SPARQL API.
 */
export default (appContext: WorldsContext) => {
  return new Router()
    .post(
      "/namespaces/:namespace/worlds/:slug/sparql",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        const pathSlug = pathGroup(ctx.params, "slug");
        if (!pathNs || pathSlug === undefined) {
          return ErrorResponse.BadRequest("Namespace and world slug required");
        }
        return await handleSparql(
          appContext,
          ctx,
          decodeURIComponent(pathNs),
          decodeURIComponent(pathSlug),
        );
      },
    )
    .post(
      "/namespaces/:namespace/worlds/sparql",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        if (!pathNs) {
          return ErrorResponse.BadRequest("Namespace required");
        }
        return await handleSparql(
          appContext,
          ctx,
          decodeURIComponent(pathNs),
          undefined,
        );
      },
    )
    .post(
      "/worlds/:slug/sparql",
      async (ctx) => {
        const pathSlug = pathGroup(ctx.params, "slug");
        if (pathSlug === undefined) {
          return ErrorResponse.BadRequest("World slug required");
        }
        return await handleSparql(
          appContext,
          ctx,
          DEFAULT_NAMESPACE,
          decodeURIComponent(pathSlug),
        );
      },
    )
    .post(
      "/worlds/sparql",
      async (ctx) => {
        return await handleSparql(
          appContext,
          ctx,
          DEFAULT_NAMESPACE,
          undefined,
        );
      },
    );
};

async function handleSparql(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
  pathNamespaceRaw: string,
  pathSlugRaw: string | undefined,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const effectiveNs = expandPathNamespace(
    pathNamespaceRaw,
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const engine = getNamespacedEngine(appContext, effectiveNs);
  try {
    const input = await ctx.request.json();
    const { query } = input;

    const merged = mergeSparqlInputFromPath(
      pathNamespaceRaw,
      pathSlugRaw,
      input,
      authorized.namespaceId,
    );

    if (!query) {
      const serialization = negotiateSerialization(ctx.request);
      const description = await engine.getServiceDescription({
        ...merged,
        endpointUrl: ctx.request.url,
        contentType: serialization.contentType as WorldsContentType,
      });
      return new Response(description, {
        headers: { "Content-Type": serialization.contentType },
      });
    }

    const result = await engine.sparql(merged);

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
