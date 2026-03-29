import { Router } from "@fartlabs/rt";
import type { RdfFormat } from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import { ErrorResponse, LocalWorlds, rdf } from "@wazoo/worlds-sdk";
const { negotiateSerialization } = rdf;

/**
 * parseQuery parses the query and dataset parameters from the request.
 */
async function parseQuery(request: Request) {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") || "";
  const method = request.method;

  const defaultGraphUris = url.searchParams.getAll("default-graph-uri");
  const namedGraphUris = url.searchParams.getAll("named-graph-uri");

  let query: string | null = null;

  if (method === "GET") {
    query = url.searchParams.get("query");
  } else if (method === "POST") {
    const queryParam = url.searchParams.get("query");
    if (queryParam) {
      query = queryParam;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      query = formData.get("query") as string | null;
    } else if (
      contentType.includes("application/sparql-query") ||
      contentType.includes("application/sparql-update")
    ) {
      query = await request.text();
    }
  }

  return { query, defaultGraphUris, namedGraphUris };
}

export default (appContext: WorldsContext) => {
  const worlds = new LocalWorlds(appContext);

  return new Router()
    .get("/worlds/:world/sparql", async (ctx) => {
      const worldId = ctx.params?.pathname.groups.world;
      if (!worldId) return ErrorResponse.BadRequest("World ID required");

      const authorized = authorizeRequest(appContext, ctx.request);
      if (!authorized.admin) return ErrorResponse.Unauthorized();

      const { query, defaultGraphUris, namedGraphUris } = await parseQuery(
        ctx.request,
      );

      if (!query) {
        const serialization = negotiateSerialization(ctx.request);
        const description = await worlds.getServiceDescription(worldId, {
          endpointUrl: ctx.request.url,
          format: serialization.format as RdfFormat,
        });
        return new Response(description, {
          headers: { "Content-Type": serialization.contentType },
        });
      }

      try {
        const result = await worlds.sparql(worldId, query, {
          defaultGraphUris,
          namedGraphUris,
        });
        return Response.json(result, {
          headers: { "Content-Type": "application/sparql-results+json" },
        });
      } catch (error) {
        return ErrorResponse.BadRequest(
          error instanceof Error ? error.message : "Query failed",
        );
      }
    })
    .post("/worlds/:world/sparql", async (ctx) => {
      const worldId = ctx.params?.pathname.groups.world;
      if (!worldId) return ErrorResponse.BadRequest("World ID required");

      const authorized = authorizeRequest(appContext, ctx.request);
      if (!authorized.admin) return ErrorResponse.Unauthorized();

      const { query, defaultGraphUris, namedGraphUris } = await parseQuery(
        ctx.request,
      );
      if (!query) return ErrorResponse.BadRequest("Query required");

      try {
        const result = await worlds.sparql(worldId, query, {
          defaultGraphUris,
          namedGraphUris,
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
