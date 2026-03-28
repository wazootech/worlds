import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { ServerContext } from "#/context.ts";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { LocalWorlds } from "#/lib/worlds/core.ts";

export default (appContext: ServerContext) => {
  const worlds = new LocalWorlds(appContext);

  return new Router()
    .get(
      "/worlds/:world/logs",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) return ErrorResponse.BadRequest("World ID required");

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) return ErrorResponse.Unauthorized();

        const url = new URL(ctx.request.url);
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
        const level = url.searchParams.get("level")?.toLowerCase();

        try {
          const logs = await worlds.listLogs(worldId, {
            page,
            pageSize,
            level,
          });
          return Response.json(logs);
        } catch (error) {
          return ErrorResponse.NotFound(
            error instanceof Error ? error.message : "World not found",
          );
        }
      },
    );
};
