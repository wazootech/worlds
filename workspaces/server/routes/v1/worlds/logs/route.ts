import { Router } from "@fartlabs/rt";

import { authorizeRequest } from "#/middleware/auth.ts";
import { checkRateLimit } from "#/middleware/rate-limit.ts";
import type { AppContext } from "#/context.ts";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { LogsService } from "#/lib/database/tables/logs/service.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export default (appContext: AppContext) => {
  return new Router()
    .get(
      "/v1/worlds/:world/logs",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.organizationId) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "logs_list",
        );
        if (rateLimitRes) return rateLimitRes;

        const worldsService = new WorldsService(appContext.libsql.database);
        const world = await worldsService.getById(worldId);
        if (!world || world.deleted_at != null) {
          return ErrorResponse.NotFound("World not found");
        }

        if (
          !authorized.admin &&
          authorized.organizationId !== world.organization_id
        ) {
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
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam
          ? Math.min(
            MAX_LIMIT,
            Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT),
          )
          : DEFAULT_LIMIT;

        const logs = await logsService.listByWorld(worldId, limit);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "logs_list",
            quantity: 1,
          });
        }

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
