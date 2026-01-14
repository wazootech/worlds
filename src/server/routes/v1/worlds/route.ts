import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";

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
          !result || result.value.deletedAt !== null ||
          (result.value.accountId !== authorized.account?.id &&
            !authorized.admin)
        ) {
          return new Response("World not found", { status: 404 });
        }

        // TODO: Respond with different formats based on the relevant HTTP header.

        return Response.json(result.value);
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
          !worldResult || worldResult.value.deletedAt !== null ||
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

        const updatedAt = Date.now();
        const result = await appContext.db.worlds.update(worldId, {
          ...body,
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
          !worldResult || worldResult.value.deletedAt !== null ||
          (worldResult.value.accountId !== authorized.account?.id &&
            !authorized.admin)
        ) {
          return new Response("World not found", { status: 404 });
        }

        // Initialize search store to drop tables
        const { LibsqlSearchStore } = await import("../../../search/libsql.ts");
        const searchStore = new LibsqlSearchStore({
          client: appContext.libsqlClient,
          embeddings: appContext.embeddings,
          tablePrefix: `world_${worldId.replace(/[^a-zA-Z0-9_]/g, "_")}_`,
        });
        await searchStore.drop();

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

        return Response.json(result.map(({ value }) => value));
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

        const now = Date.now();
        const result = await appContext.db.worlds.add({
          accountId: authorized.account.id,
          name: body.name,
          description: body.description,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });

        if (!result.ok) {
          return Response.json({ error: "Failed to create world" }, {
            status: 500,
          });
        }

        return Response.json(null, { status: 201 });
      },
    );
};
