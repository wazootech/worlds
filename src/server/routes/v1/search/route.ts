import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import { LibsqlSearchStoreManager } from "#/server/search/libsql.ts";
import { checkRateLimit } from "#/server/middleware/rate-limit.ts";
import { worldsFind } from "#/server/db/queries/worlds.sql.ts";

export default (appContext: AppContext) => {
  return new Router().get(
    "/v1/search",
    async (ctx) => {
      const authorized = await authorizeRequest(appContext, ctx.request);
      if (!authorized.account && !authorized.admin) {
        return new Response("Unauthorized", { status: 401 });
      }

      const url = new URL(ctx.request.url);
      const query = url.searchParams.get("q");
      if (!query) {
        return new Response("Query required", { status: 400 });
      }

      const worldIdsParam = url.searchParams.get("worlds");
      const worldIds = worldIdsParam ? worldIdsParam.split(",") : undefined;
      const validWorldIds: string[] = [];
      let accountId: string | undefined;

      if (worldIds) {
        for (const worldId of worldIds) {
          const worldResult = await appContext.libsqlClient.execute({
            sql: worldsFind,
            args: [worldId],
          });
          const world = worldResult.rows[0];

          if (
            !world || world.deleted_at != null ||
            (world.account_id !== authorized.account?.id &&
              !authorized.admin)
          ) {
            continue;
          }
          validWorldIds.push(worldId);
          if (!accountId) {
            accountId = world.account_id as string;
          }
        }
      }

      if (worldIds && validWorldIds.length === 0) {
        return new Response("No valid worlds found", { status: 404 });
      }

      if (!accountId) {
        if (authorized.account) {
          accountId = authorized.account.id;
        } else if (authorized.admin) {
          const accountParam = url.searchParams.get("account");
          if (accountParam) {
            accountId = accountParam;
          } else {
            return new Response("Account ID required for admin search", {
              status: 400,
            });
          }
        }
      }

      // Apply rate limiting if account is present
      let rateLimitHeaders: Record<string, string> = {};
      if (authorized.account) {
        try {
          rateLimitHeaders = await checkRateLimit(
            appContext,
            authorized.account.id,
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

      const limit = url.searchParams.get("limit");
      try {
        const results = await store.search(query, {
          accountId: accountId!,
          worldIds: validWorldIds.length > 0 ? validWorldIds : undefined,
          limit: limit ? parseInt(limit, 10) : undefined,
        });
        return new Response(JSON.stringify(results), {
          headers: {
            "Content-Type": "application/json",
            ...rateLimitHeaders,
          },
        });
      } catch (error) {
        console.error("Search error:", error);
        return new Response("Search failed", { status: 500 });
      }
    },
  );
};
