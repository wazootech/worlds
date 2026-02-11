import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import { checkRateLimit } from "#/middleware/rate-limit.ts";
import type { AppContext } from "#/context.ts";
import { limitParamSchema } from "@wazoo/sdk";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";
import { ChunksService } from "#/lib/database/tables/chunks/service.ts";
import { LogsService } from "#/lib/database/tables/logs/service.ts";
import { ulid } from "@std/ulid/ulid";

export default (appContext: AppContext) => {
  return new Router().get(
    "/v1/worlds/:world/search",
    async (ctx) => {
      const worldId = ctx.params?.pathname.groups.world;
      if (!worldId) {
        return ErrorResponse.BadRequest("World ID required");
      }

      const authorized = await authorizeRequest(appContext, ctx.request);
      if (!authorized.admin && !authorized.organizationId) {
        return ErrorResponse.Unauthorized();
      }

      const worldsService = new WorldsService(appContext.libsql.database);
      const world = await worldsService.getById(worldId);
      if (!world || world.deleted_at != null) {
        return ErrorResponse.NotFound("World not found");
      }

      if (
        !authorized.admin && authorized.organizationId !== world.organization_id
      ) {
        return ErrorResponse.Forbidden();
      }

      const rateLimitRes = await checkRateLimit(
        appContext,
        authorized,
        "semantic_search",
      );
      if (rateLimitRes) return rateLimitRes;

      const url = new URL(ctx.request.url);
      const query = url.searchParams.get("query");
      const subjects = url.searchParams.getAll("subjects");
      const predicates = url.searchParams.getAll("predicates");

      if (!query) {
        return ErrorResponse.BadRequest("Query required");
      }

      const limitParam = url.searchParams.get("limit");
      let limit = 20;

      // Validate limit parameter if present
      if (limitParam) {
        const parsedLimit = parseInt(limitParam, 10);
        const limitResult = limitParamSchema.safeParse(parsedLimit);

        if (!limitResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid limit parameter: must be a positive integer <= 100",
          );
        }

        limit = limitResult.data;
      }

      try {
        const chunksService = new ChunksService(appContext, worldsService);
        const results = await chunksService.search({
          query,
          world,
          subjects,
          predicates,
          limit,
        });

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "semantic_search",
            quantity: 1,
            metadata: {
              world_id: worldId,
            },
          });
        }

        const managed = await appContext.libsql.manager.get(worldId);
        const logsService = new LogsService(managed.database);
        await logsService.add({
          id: ulid(),
          world_id: worldId,
          timestamp: Date.now(),
          level: "info",
          message: "Semantic search executed",
          metadata: {
            query: query.slice(0, 500),
            subjects: subjects.length > 0 ? subjects : null,
            predicates: predicates.length > 0 ? predicates : null,
          },
        });

        return Response.json(results);
      } catch (error) {
        console.error("World search error:", error);
        return ErrorResponse.InternalServerError("Search failed");
      }
    },
  );
};
