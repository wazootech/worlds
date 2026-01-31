import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import { LibsqlSearchStoreManager } from "#/server/search/libsql.ts";
import { checkRateLimit } from "#/server/middleware/rate-limit.ts";
import { selectWorldById } from "#/server/db/resources/worlds/queries.sql.ts";
import { limitParamSchema } from "#/sdk/pagination.ts";
import { worldIdsParamSchema } from "#/sdk/worlds/schema.ts";
import { worldRowSchema } from "#/server/db/resources/worlds/schema.ts";
import { ErrorResponse } from "#/server/errors.ts";

export default (appContext: AppContext) => {
  return new Router().get(
    "/v1/search",
    async (ctx) => {
      const authorized = await authorizeRequest(appContext, ctx.request);
      if (!authorized.tenant && !authorized.admin) {
        return ErrorResponse.Unauthorized();
      }

      const url = new URL(ctx.request.url);
      const query = url.searchParams.get("q");
      if (!query) {
        return ErrorResponse.BadRequest("Query required");
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

      const validWorldIds: string[] = [];
      let tenantId: string | undefined;

      if (worldIds) {
        for (const worldId of worldIds) {
          const worldResult = await appContext.libsqlClient.execute({
            sql: selectWorldById,
            args: [worldId],
          });
          const rawWorld = worldResult.rows[0];

          if (
            !rawWorld || rawWorld.deleted_at != null ||
            (rawWorld.tenant_id !== authorized.tenant?.id &&
              !authorized.admin)
          ) {
            continue;
          }

          // Validate SQL result
          const world = worldRowSchema.parse({
            id: rawWorld.id,
            tenant_id: rawWorld.tenant_id,
            label: rawWorld.label,
            description: rawWorld.description,
            created_at: rawWorld.created_at,
            updated_at: rawWorld.updated_at,
            deleted_at: rawWorld.deleted_at,
          });

          validWorldIds.push(worldId);
          if (!tenantId) {
            tenantId = world.tenant_id as string;
          }
        }
      }

      if (worldIds && validWorldIds.length === 0) {
        return ErrorResponse.NotFound("No valid worlds found");
      }

      if (!tenantId) {
        if (authorized.tenant) {
          tenantId = authorized.tenant.id;
        } else if (authorized.admin) {
          tenantId = url.searchParams.get("tenant") || undefined;

          if (!tenantId) {
            return ErrorResponse.BadRequest(
              "Tenant ID required for admin search",
            );
          }
        }
      }

      // Apply rate limiting if tenant is present
      let rateLimitHeaders: Record<string, string> = {};
      if (authorized.tenant) {
        try {
          rateLimitHeaders = await checkRateLimit(
            appContext,
            authorized.tenant.id,
            validWorldIds[0] ?? "global",
            { resourceType: "search" },
          );
        } catch (error) {
          if (error instanceof Response) return error;
          throw error;
        }
      }

      const store = new LibsqlSearchStoreManager({
        client: appContext.libsqlClient,
        embeddings: appContext.embeddings,
      });
      await store.createTablesIfNotExists();

      const limitParam = url.searchParams.get("limit");
      let limit: number | undefined;

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
        const results = await store.search(query, {
          tenantId: tenantId!,
          worldIds: validWorldIds.length > 0 ? validWorldIds : undefined,
          limit: limit,
        });
        return Response.json(results, {
          headers: rateLimitHeaders,
        });
      } catch (error) {
        console.error("Search error:", error);
        return ErrorResponse.InternalServerError("Search failed");
      }
    },
  );
};
