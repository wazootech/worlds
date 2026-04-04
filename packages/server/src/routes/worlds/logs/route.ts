import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "@wazoo/worlds-sdk";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { getNamespacedEngine } from "#/utils/engine.ts";

/**
 * logsRouter creates a router for the World Logs API.
 */
export default (appContext: WorldsContext) => {
  return new Router()
    .get(
      "/worlds/:world/logs",
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
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
        const level = url.searchParams.get("level")?.toLowerCase();

        try {
          const logs = await engine.listLogs({
            world: slug,
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
