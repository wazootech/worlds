import { Router } from "@fartlabs/rt";
import type { AppContext } from "#/app-context.ts";
import { auth } from "#/auth.ts";
import { parseSparqlRequest } from "./sparql-request-parser.ts";
import { serializeSparqlResult } from "./sparql-result-serializer.ts";

export default ({ oxigraphService, apiKeysService }: AppContext) => {
  return new Router()
    .get("/v1/stores/:store/sparql", async (ctx) => {
      const isAuthenticated = await auth(ctx.request, apiKeysService);
      if (!isAuthenticated) {
        return new Response("Unauthorized", { status: 401 });
      }

      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) return new Response("Store ID required", { status: 400 });

      const url = new URL(ctx.request.url);
      const query = url.searchParams.get("query");

      if (!query) {
        return Response.json({ error: "Missing query parameter" }, {
          status: 400,
        });
      }

      try {
        const result = await oxigraphService.query(storeId, query);
        return Response.json(serializeSparqlResult(result));
      } catch (err) {
        if (err instanceof Error && err.message === "Store not found") {
          return new Response("Store not found", { status: 404 });
        }
        return Response.json({ error: "Invalid Query" }, { status: 400 });
      }
    })
    .post("/v1/stores/:store/sparql", async (ctx) => {
      const isAuthenticated = await auth(ctx.request, apiKeysService);
      if (!isAuthenticated) {
        return new Response("Unauthorized", { status: 401 });
      }

      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) return new Response("Store ID required", { status: 400 });

      let parsed;
      try {
        parsed = await parseSparqlRequest(ctx.request);
      } catch (_e) {
        return Response.json({ error: "Unsupported Content-Type" }, {
          status: 400,
        });
      }

      const { query, update } = parsed;

      try {
        if (query) {
          const result = await oxigraphService.query(storeId, query);
          return Response.json(serializeSparqlResult(result));
        } else if (update) {
          await oxigraphService.update(storeId, update);
          return new Response(null, { status: 204 });
        } else {
          return Response.json({ error: "Missing query or update" }, {
            status: 400,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.message === "Store not found") {
          return new Response("Store not found", { status: 404 });
        }
        return Response.json({ error: "Execution failed" }, { status: 400 });
      }
    });
};
