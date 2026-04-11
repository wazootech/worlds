import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { getNamespacedEngine } from "#/utils/engine.ts";


/**
 * searchRouter creates a router for the World Search API.
 */
export default (appContext: WorldsContext) => {
  return new Router().post(
    "/search",
    async (ctx) => {
      const authorized = await authorizeRequest(
        appContext,
        ctx.request,
      );
      if (!authorized.admin && !authorized.namespaceId) {
        return ErrorResponse.Unauthorized();
      }

      const engine = getNamespacedEngine(appContext, authorized.namespaceId);
      try {
        const body = await ctx.request.json();
        const results = await engine.search({
          ...body,
          namespace: authorized.namespaceId,
        });
        return Response.json(results);
      } catch (error) {
        return ErrorResponse.BadRequest(
          error instanceof Error ? error.message : "Search failed",
        );
      }
    },
  );
};
