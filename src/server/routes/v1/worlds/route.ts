import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import { LibsqlSearchStoreManager } from "#/server/search/libsql.ts";
import {
  createWorldParamsSchema,
  updateWorldParamsSchema,
} from "#/server/schemas.ts";
import { getPlanPolicy } from "#/server/rate-limit/policies.ts";

export default (appContext: AppContext) => {
  return new Router()
    .get(
      "/v1/worlds/:world",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        const result = await appContext.db.worlds.find(worldId);

        if (
          !result || result.value.deletedAt != null ||
          (result.value.accountId !== authorized.account?.id &&
            !authorized.admin)
        ) {
          return new Response("World not found", { status: 404 });
        }

        // TODO: Respond with different formats based on the relevant HTTP header.

        return Response.json({ ...result.value, id: worldId });
      },
    )
    .put(
      "/v1/worlds/:world",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        const worldResult = await appContext.db.worlds.find(worldId);
        if (
          !worldResult || worldResult.value.deletedAt != null ||
          (worldResult.value.accountId !== authorized.account?.id &&
            !authorized.admin)
        ) {
          return new Response("World not found", { status: 404 });
        }

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parseResult = updateWorldParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return Response.json(parseResult.error, { status: 400 });
        }
        const data = parseResult.data;

        const updatedAt = Date.now();
        const result = await appContext.db.worlds.update(worldId, {
          label: data.label ?? worldResult.value.label,
          description: data.description ?? worldResult.value.description,
          isPublic: data.isPublic ?? worldResult.value.isPublic,
          updatedAt,
        });
        if (!result.ok) {
          return Response.json({ error: "Failed to update world" }, {
            status: 500,
          });
        }

        return new Response(null, { status: 204 });
      },
    )
    .delete(
      "/v1/worlds/:world",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        const worldResult = await appContext.db.worlds.find(worldId);
        if (
          !worldResult || worldResult.value.deletedAt != null ||
          (worldResult.value.accountId !== authorized.account?.id &&
            !authorized.admin)
        ) {
          return new Response("World not found", { status: 404 });
        }

        // Initialize search store to delete world's search data
        const searchStore = new LibsqlSearchStoreManager({
          client: appContext.libsqlClient,
          embeddings: appContext.embeddings,
        });
        await searchStore.createTablesIfNotExists();
        await searchStore.deleteWorld(worldResult.value.accountId, worldId);

        // Delete world blob and metadata sequentially (kvdex atomic limitation with serialized collections)
        await appContext.db.worldBlobs.delete(worldId);
        await appContext.db.worlds.delete(worldId);

        return new Response(null, { status: 204 });
      },
    )
    .get(
      "/v1/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account) {
          return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(ctx.request.url);
        const pageString = url.searchParams.get("page") ?? "1";
        const pageSizeString = url.searchParams.get("pageSize") ?? "20";
        const page = parseInt(pageString);
        const pageSize = parseInt(pageSizeString);
        const offset = (page - 1) * pageSize;
        const { result } = await appContext.db.worlds.findBySecondaryIndex(
          "accountId",
          authorized.account.id,
          {
            limit: pageSize,
            offset: offset,
          },
        );

        return Response.json(
          result.map(({ value, id }) => ({ ...value, id })),
        );
      },
    )
    .post(
      "/v1/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parseResult = createWorldParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return Response.json(parseResult.error, { status: 400 });
        }
        const data = parseResult.data;
        const planPolicy = getPlanPolicy(authorized.account.value.plan ?? null);
        const { result: worlds } = await appContext.db.worlds
          .findBySecondaryIndex(
            "accountId",
            authorized.account.id,
          );
        const activeWorlds = worlds.filter((w) => w.value.deletedAt == null);
        if (activeWorlds.length >= planPolicy.worldLimits.maxWorlds) {
          return new Response("World limit reached", { status: 403 });
        }

        const now = Date.now();
        const world = {
          accountId: authorized.account!.id,
          label: data.label,
          description: data.description,
          createdAt: now,
          updatedAt: now,
          deletedAt: undefined,
          isPublic: data.isPublic,
        };
        const result = await appContext.db.worlds.add(world);

        if (!result.ok) {
          return Response.json({ error: "Failed to create world" }, {
            status: 500,
          });
        }

        return Response.json({ ...world, id: result.id }, { status: 201 });
      },
    );
};
