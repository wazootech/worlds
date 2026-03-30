import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { ErrorResponse, LocalWorlds } from "@wazoo/worlds-sdk";

export default (appContext: WorldsContext) => {
  const worlds = new LocalWorlds(appContext);

  return new Router().get(
    "/worlds/:world/search",
    async (ctx) => {
      const worldId = ctx.params?.pathname.groups.world;
      if (!worldId) return ErrorResponse.BadRequest("World ID required");

      const authorized = authorizeRequest(appContext, ctx.request);
      if (!authorized.admin) return ErrorResponse.Unauthorized();

      const url = new URL(ctx.request.url);
      const query = url.searchParams.get("query") ?? "";
      const subjects = url.searchParams.getAll("subjects");
      const predicates = url.searchParams.getAll("predicates");
      const types = url.searchParams.getAll("types");
      const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

      try {
        const results = await worlds.search(worldId, query, {
          limit,
          subjects,
          predicates,
          types,
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
