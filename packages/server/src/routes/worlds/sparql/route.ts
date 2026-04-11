import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { negotiateSerialization } from "#/utils/http/negotiation.ts";
import type { WorldsContentType, WorldsContext } from "@wazoo/worlds-sdk";
import { getNamespacedEngine } from "#/utils/engine.ts";

/**
 * sparqlRouter creates a router for the SPARQL API.
 */
export default (appContext: WorldsContext) => {
  return new Router()
    .post("/sparql", async (ctx) => {
      const authorized = await authorizeRequest(
        appContext,
        ctx.request,
      );
      if (!authorized.admin && !authorized.namespaceId) {
        return ErrorResponse.Unauthorized();
      }

      const engine = getNamespacedEngine(appContext, authorized.namespaceId);
      try {
        const input = await ctx.request.json();
        const { query } = input;

        if (!query) {
          const serialization = negotiateSerialization(ctx.request);
          const description = await engine.getServiceDescription({
            ...input,
            namespace: authorized.namespaceId,
            endpointUrl: ctx.request.url,
            contentType: serialization.contentType as WorldsContentType,
          });
          return new Response(description, {
            headers: { "Content-Type": serialization.contentType },
          });
        }

        const result = await engine.sparql({
          ...input,
          namespace: authorized.namespaceId,
        });

        if (result === null) return new Response(null, { status: 204 });
        return Response.json(result, {
          headers: { "Content-Type": "application/sparql-results+json" },
        });
      } catch (error) {
        return ErrorResponse.BadRequest(
          error instanceof Error ? error.message : "Query/update failed",
        );
      }
    });
};
