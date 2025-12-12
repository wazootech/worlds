import { Router } from "@fartlabs/rt";
import type { AppContext } from "#/app-context.ts";
import { authorizeRequest } from "#/accounts/authorize.ts";
import { plans, reachedPlanLimit } from "#/accounts/plans.ts";
import { parseSparqlRequest } from "./sparql-request-parser.ts";
import { serializeSparqlResult } from "./sparql-result-serializer.ts";
import { Store } from "oxigraph";

export default ({ oxigraphService, accountsService }: AppContext) => {
  return new Router()
    .get("/v1/worlds/:world/sparql", async (ctx) => {
      const worldId = ctx.params?.pathname.groups.world;
      if (!worldId) {
        return new Response("World ID required", { status: 400 });
      }

      const authorized = await authorizeRequest(accountsService, ctx.request);
      if (!authorized) {
        return new Response("Unauthorized", { status: 401 });
      }

      if (
        !authorized.admin &&
        !authorized.account?.accessControl.worlds.includes(worldId)
      ) {
        return new Response("World not found", { status: 404 });
      }

      const url = new URL(ctx.request.url);
      const query = url.searchParams.get("query");

      if (!query) {
        return Response.json({ error: "Missing query parameter" }, {
          status: 400,
        });
      }

      try {
        const result = await oxigraphService.query(worldId, query);
        return Response.json(serializeSparqlResult(result));
      } catch (err) {
        if (err instanceof Error && err.message === "Store not found") {
          return new Response("World not found", { status: 404 });
        }
        return Response.json({ error: "Invalid Query" }, { status: 400 });
      }
    })
    .post("/v1/worlds/:world/sparql", async (ctx) => {
      const worldId = ctx.params?.pathname.groups.world;
      if (!worldId) {
        return new Response("World ID required", { status: 400 });
      }

      const authorized = await authorizeRequest(accountsService, ctx.request);
      if (!authorized) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Access check deferred to handle lazy claiming

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
        const metadata = await oxigraphService.getMetadata(worldId);

        if (metadata) {
          // Check access (404 privacy)
          if (
            !authorized.admin &&
            !authorized.account?.accessControl.worlds.includes(worldId)
          ) {
            return new Response("World not found", { status: 404 });
          }
        }

        if (query) {
          if (!metadata) {
            return new Response("World not found", { status: 404 });
          }
          const result = await oxigraphService.query(worldId, query);
          return Response.json(serializeSparqlResult(result));
        } else if (update) {
          if (!metadata) {
            // Lazy claiming
            if (!authorized.admin && authorized.account) {
              if (reachedPlanLimit(authorized.account)) {
                return Response.json(
                  {
                    error: "Plan limit reached",
                    limit: plans[authorized.account.plan].worlds,
                  },
                  { status: 403 },
                );
              }
              // Add to access control
              authorized.account.accessControl.worlds.push(worldId);
              await accountsService.set(authorized.account);
            }

            // Determine owner
            const owner = authorized.account?.id ||
              (authorized.admin ? "admin" : "unknown");
            if (owner === "unknown") {
              return new Response("Unauthorized", { status: 401 });
            }

            // Create empty store
            await oxigraphService.setStore(worldId, owner, new Store());
          }

          await oxigraphService.update(worldId, update);
          return new Response(null, { status: 204 });
        } else {
          return Response.json({ error: "Missing query or update" }, {
            status: 400,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.message === "Store not found") {
          return new Response("World not found", { status: 404 });
        }
        return Response.json({ error: "Execution failed" }, { status: 400 });
      }
    });
};
