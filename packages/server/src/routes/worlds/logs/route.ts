import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "@wazoo/worlds-sdk";
import type { WorldsContext } from "@wazoo/worlds-sdk";

/**
 * logsRouter creates a router for the World Logs API.
 */
export default (appContext: WorldsContext) => {
  const engine = appContext.engine;
  if (!engine) {
    throw new Error("Engine not initialized in context");
  }

  return new Router()
    .get(
      "/worlds/:world/logs",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) return ErrorResponse.BadRequest("World ID required");

        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin) return ErrorResponse.Unauthorized();

        const url = new URL(ctx.request.url);
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
        const level = url.searchParams.get("level")?.toLowerCase();

        try {
          const logs = await engine.listLogs({
            world: worldId,
            page,
            pageSize,
            level: level ?? undefined,
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
