import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import { checkRateLimit } from "#/middleware/rate-limit.ts";
import type { AppContext } from "#/context.ts";
import { limitParamSchema, worldIdsParamSchema } from "@wazoo/sdk";
import { ErrorResponse } from "#/errors.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";
import { ChunksService } from "#/lib/database/tables/chunks/service.ts";
import type { WorldRow } from "#/lib/database/tables/worlds/schema.ts";

export default (appContext: AppContext) => {
  return new Router().get(
    "/v1/search",
    async (ctx) => {
      const authorized = await authorizeRequest(appContext, ctx.request);
      if (!authorized.admin && !authorized.serviceAccountId) {
        return ErrorResponse.Unauthorized();
      }
      const rateLimitRes = await checkRateLimit(
        appContext,
        authorized,
        "semantic_search",
      );
      if (rateLimitRes) return rateLimitRes;

      const url = new URL(ctx.request.url);
      const query = url.searchParams.get("q");
      const subjects = url.searchParams.getAll("subjects");
      const predicates = url.searchParams.getAll("predicates");

      if (!query) {
        return ErrorResponse.BadRequest("Query required");
      }

      // Organization check
      const organizationIdParam = url.searchParams.get("organizationId");
      const organizationId = authorized.admin
        ? organizationIdParam
        : authorized.organizationId;

      if (!organizationId) {
        return ErrorResponse.BadRequest("Organization ID required");
      }

      if (
        !authorized.admin && organizationIdParam &&
        organizationIdParam !== authorized.organizationId
      ) {
        return ErrorResponse.Forbidden();
      }

      const worldIdsParam = url.searchParams.get("worlds");
      let worldIds: string[] | undefined;

      // Validate worldIds parameter if present
      if (worldIdsParam) {
        const worldIdsArray = worldIdsParam.split(",");
        const worldIdsResult = worldIdsParamSchema.safeParse(worldIdsArray);

        if (!worldIdsResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid worlds parameter: too many IDs or invalid format",
          );
        }

        worldIds = worldIdsResult.data;
      }

      let worlds: WorldRow[] = [];

      const worldsService = new WorldsService(appContext.database);
      const metricsService = new MetricsService(appContext.database);
      const chunksService = new ChunksService(appContext, worldsService);

      // If no worldIds provided, list all worlds for the organization
      if (!worldIds) {
        worlds = await worldsService.getByOrganizationId(
          organizationId,
          100,
          0,
        );
      } else {
        // Validate specifically requested worlds belong to the organization
        for (const worldId of worldIds) {
          const world = await worldsService.getById(worldId);
          if (world && world.organization_id === organizationId) {
            worlds.push(world);
          }
        }
      }

      if (worlds.length === 0) {
        return Response.json([]);
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
        const results = [];
        for (const world of worlds) {
          const worldResults = await chunksService.search({
            query,
            world,
            subjects,
            predicates,
            limit,
          });
          results.push(...worldResults);
        }

        if (authorized.serviceAccountId) {
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "semantic_search",
            quantity: 1,
            metadata: {
              world_count: worlds.length,
            },
          });
        }

        return Response.json(
          results.sort((a, b) => b.score - a.score).slice(0, limit),
        );
      } catch (error) {
        console.error("Global search error:", error);
        return ErrorResponse.InternalServerError("Search failed");
      }
    },
  );
};
