import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "@wazoo/worlds-sdk";
import type { WorldsContext } from "@wazoo/worlds-sdk";

/**
 * searchRouter creates a router for the World Search API.
 */
export default (appContext: WorldsContext) => {
  const engine = appContext.engine;
  if (!engine) {
    throw new Error("Engine not initialized in context");
  }

  return new Router().get(
    "/worlds/:world/search",
    async (ctx) => {
      const worldId = ctx.params?.pathname.groups.world;
      if (!worldId) return ErrorResponse.BadRequest("World ID required");

      const authorized = await authorizeRequest(
        appContext,
        ctx.request,
      );
      if (!authorized.admin) return ErrorResponse.Unauthorized();

      const url = new URL(ctx.request.url);
      const query = url.searchParams.get("query") ?? "";
      const subjects = url.searchParams.getAll("subjects");
      const predicates = url.searchParams.getAll("predicates");
      const types = url.searchParams.getAll("types");
      const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

      try {
        const results = await engine.search({
          world: worldId,
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
