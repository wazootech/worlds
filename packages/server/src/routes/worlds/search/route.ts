import { Router } from "@fartlabs/rt";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import {
  DEFAULT_NAMESPACE,
  expandPathNamespace,
  mergeSearchInputFromPath,
} from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
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
 * searchRouter creates a router for the World Search API.
 */
export default (appContext: WorldsContext) => {
  return new Router()
    .post(
      "/namespaces/:namespace/worlds/:slug/search",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        const pathSlug = pathGroup(ctx.params, "slug");
        if (!pathNs || pathSlug === undefined) {
          return ErrorResponse.BadRequest("Namespace and world slug required");
        }
        return await handleSearch(
          appContext,
          ctx,
          decodeURIComponent(pathNs),
          decodeURIComponent(pathSlug),
        );
      },
    )
    .post(
      "/namespaces/:namespace/worlds/search",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        if (!pathNs) {
          return ErrorResponse.BadRequest("Namespace required");
        }
        return await handleSearch(
          appContext,
          ctx,
          decodeURIComponent(pathNs),
          undefined,
        );
      },
    )
    .post(
      "/worlds/:slug/search",
      async (ctx) => {
        const pathSlug = pathGroup(ctx.params, "slug");
        if (pathSlug === undefined) {
          return ErrorResponse.BadRequest("World slug required");
        }
        return await handleSearch(
          appContext,
          ctx,
          DEFAULT_NAMESPACE,
          decodeURIComponent(pathSlug),
        );
      },
    )
    .post(
      "/worlds/search",
      async (ctx) => {
        return await handleSearch(
          appContext,
          ctx,
          DEFAULT_NAMESPACE,
          undefined,
        );
      },
    );
};

async function handleSearch(
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
    const body = await ctx.request.json();
    const merged = mergeSearchInputFromPath(
      pathNamespaceRaw,
      pathSlugRaw,
      body,
      authorized.namespaceId,
    );
    const results = await engine.search(merged);
    return Response.json(results);
  } catch (error) {
    return ErrorResponse.BadRequest(
      error instanceof Error ? error.message : "Search failed",
    );
  }
}
