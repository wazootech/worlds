import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { getNamespacedEngine } from "#/utils/engine.ts";

/**
 * searchRouter creates a router for the World Search API.
 */
export default (appContext: WorldsContext) => {
  return new Router().get(
    "/worlds/:world/search",
    async (ctx) => {
      const slug = ctx.params?.pathname.groups.world;
      if (!slug) return ErrorResponse.BadRequest("World slug required");

      const authorized = await authorizeRequest(
        appContext,
        ctx.request,
      );
      if (!authorized.admin && !authorized.namespaceId) {
        return ErrorResponse.Unauthorized();
      }

      const engine = getNamespacedEngine(appContext, authorized.namespaceId);
      const url = new URL(ctx.request.url);
      const query = url.searchParams.get("query") ?? "";
      const subjects = url.searchParams.getAll("subjects");
      const predicates = url.searchParams.getAll("predicates");
      const types = url.searchParams.getAll("types");
      const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

      try {
        const results = await engine.search({
          world: slug,
          query,
          limit,
          subjects: subjects.length > 0 ? subjects : undefined,
          predicates: predicates.length > 0 ? predicates : undefined,
          types: types.length > 0 ? types : undefined,
        });
        return Response.json(results);
      } catch (error) {
        return ErrorResponse.NotFound(
          error instanceof Error ? error.message : "World not found",
        );
      }
    },
  );
};


