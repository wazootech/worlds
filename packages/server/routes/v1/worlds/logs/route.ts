import { Router } from "@fartlabs/rt";

import { authorizeRequest } from "#/middleware/auth.ts";

import type { ServerContext } from "#/context.ts";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { LogsService } from "#/lib/database/tables/logs/service.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export default (appContext: ServerContext) => {
  return new Router()
    .get(
      "/v1/worlds/:world/logs",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const worldsService = new WorldsService(appContext.libsql.database);
        const world = await worldsService.getById(worldId);
        if (!world || world.deleted_at != null) {
          return ErrorResponse.NotFound("World not found");
        }

        if (!authorized.admin) {
          return ErrorResponse.Forbidden();
        }

        if (!appContext.libsql.manager) {
          return ErrorResponse.InternalServerError(
            "World database not available",
          );
        }
        const managed = await appContext.libsql.manager.get(worldId);
        const logsService = new LogsService(managed.database);

        const url = new URL(ctx.request.url);
        const pageParam = url.searchParams.get("page");
        const pageSizeParam = url.searchParams.get("pageSize");
        const level = url.searchParams.get("level")?.toLowerCase();

        const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
        const pageSize = pageSizeParam
          ? Math.min(
            MAX_LIMIT,
            Math.max(1, parseInt(pageSizeParam, 10) || DEFAULT_LIMIT),
          )
          : DEFAULT_LIMIT;

        const logs = await logsService.listByWorld(
          worldId,
          page,
          pageSize,
          level,
        );

        return Response.json(
          logs.map((log) => ({
            id: log.id,
            worldId: log.world_id,
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            metadata: log.metadata,
          })),
        );
      },
    );
};
