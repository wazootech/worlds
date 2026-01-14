import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";

export default (appContext: AppContext) => {
  return new Router()
    .get(
      "/v1/worlds/:world/usage",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldResult = await appContext.db.worlds.find(worldId);
        if (
          !worldResult || worldResult.value.deletedAt !== null ||
          (worldResult.value.accountId !== authorized.account?.id &&
            !authorized.admin)
        ) {
          return new Response("World not found", { status: 404 });
        }

        const url = new URL(ctx.request.url);
        const pageString = url.searchParams.get("page") ?? "1";
        const pageSizeString = url.searchParams.get("pageSize") ?? "20";
        const page = parseInt(pageString);
        const pageSize = parseInt(pageSizeString);
        const offset = (page - 1) * pageSize;
        const { result } = await appContext.db.usageBuckets
          .findBySecondaryIndex(
            "worldId",
            worldId,
            {
              limit: pageSize,
              offset: offset,
            },
          );

        return Response.json(result.map(({ value }) => value));
      },
    );
};
