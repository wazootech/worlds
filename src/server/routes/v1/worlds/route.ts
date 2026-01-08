import { Router } from "@fartlabs/rt";
import { accepts } from "@std/http/negotiation";
import { ulid } from "@std/ulid/ulid";
import {
  type DecodableEncoding,
  decodeStore,
  type EncodableEncoding,
  encodableEncodings,
  encodeStore,
  isDecodableEncoding,
  isEncodableEncoding,
} from "#/core/worlds/encoding.ts";
import type { AppContext } from "#/server/app-context.ts";
import { plans, reachedPlanLimit } from "#/core/accounts/plans.ts";
import { authorizeRequest } from "#/core/accounts/authorize.ts";

export default (
  { oxigraphService, accountsService, usageService }: AppContext,
) => {
  return new Router()
    .get(
      "/v1/worlds/:world",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);

        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        if (
          !authorized.admin &&
          !authorized.account?.accessControl.worlds.includes(worldId)
        ) {
          return new Response("World not found", { status: 404 });
        }

        const metadata = await oxigraphService.getMetadata(worldId);
        if (!metadata) {
          return new Response("World not found", { status: 404 });
        }

        const supported = [
          "application/json",
          ...Object.values(encodableEncodings),
        ] as string[];
        const encoding = accepts(ctx.request, ...supported) ??
          "application/json";
        if (encoding === "application/json") {
          return Response.json(metadata);
        }

        if (!isEncodableEncoding(encoding)) {
          return new Response("Unsupported encoding", { status: 400 });
        }

        try {
          const store = await oxigraphService.getStore(worldId);
          if (!store) {
            return new Response("World not found", { status: 404 });
          }

          const dataStream = encodeStore(store, encoding as EncodableEncoding);
          if (authorized.account) {
            const timestamp = Date.now();
            const id = ulid(timestamp);
            await usageService.meter({
              id,
              timestamp,
              accountId: authorized.account.id,
              endpoint: "GET /worlds/{worldId}",
              params: { worldId },
              statusCode: 200,
            });
          }
          return new Response(dataStream, {
            headers: { "Content-Type": encoding },
          });
        } catch (_error) {
          return Response.json({ error: "Encoding failed" }, { status: 500 });
        }
      },
    )
    .get(
      "/v1/worlds/:world/usage",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);

        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        if (
          !authorized.admin &&
          !authorized.account?.accessControl.worlds.includes(worldId)
        ) {
          return new Response("World not found", { status: 404 });
        }

        const accountId = authorized.account?.id;
        if (!accountId) {
          if (authorized.admin) {
            return new Response("Account context required", { status: 400 });
          }
          // Should not happen if authorized is valid but handled for safety
          return new Response("Unauthorized", { status: 401 });
        }

        const usage = await usageService.getUsage(accountId);

        // Filter buckets for this world
        const worldUsage = usage.filter((bucket) =>
          bucket.endpoint.includes(`/worlds/${worldId}`)
        );

        return Response.json(worldUsage);
      },
    )
    .put(
      "/v1/worlds/:world",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);

        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        if (!authorized.admin && !authorized.account) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Check if world exists to determine if this is a Create or Update
        const metadata = await oxigraphService.getMetadata(worldId);

        if (metadata) {
          // Existing world: enforce access control
          if (
            !authorized.admin &&
            !authorized.account?.accessControl.worlds.includes(worldId)
          ) {
            return new Response("World not found", { status: 404 });
          }
        } else {
          // New world: check plan limits
          if (!authorized.admin && authorized.account) {
            // Optimization: We could check exact count here if not trusted.
            // But relying on simple plan check:
            if (reachedPlanLimit(authorized.account)) {
              return Response.json(
                {
                  error: "Plan limit reached",
                  limit: plans[authorized.account.plan].worlds,
                },
                { status: 403 },
              );
            }
            // Add world to account's access control (in-memory update for subsequent ref, persistence handled in setStore implicitly via ownership)
            // Note: setStore will assign ownership.
            // We add it to the authorised account object so the 'includes' check passes if we re-use it?
            // Actually this block creates it.
            authorized.account.accessControl.worlds.push(worldId);

            // Persist access claim (ownership)
            // Wait, setStore handles KB_WORLDS insert.
            // Do we need explicit addWorldAccess?
            // setStore call later does: "INSERT OR IGNORE INTO kb_worlds ... VALUES (id, owner...)"
            // So we don't strictly need addWorldAccess here if setStore does it.
            // But addWorldAccess updates update_at etc?
            // Let's keep it clean: setStore handles creation.
          }
        }

        const contentType = ctx.request.headers.get("Content-Type");

        if (!contentType) {
          return Response.json({ error: "Content-Type required" }, {
            status: 400,
          });
        }

        if (!isDecodableEncoding(contentType)) {
          return Response.json({ error: "Unsupported Content-Type" }, {
            status: 400,
          });
        }

        const bodyText = await ctx.request.text();

        try {
          const stream = new Blob([bodyText]).stream();
          const store = await decodeStore(
            stream,
            contentType as DecodableEncoding,
          );
          // console.log(`PUT ${worldId}: body len=${bodyText.length}, store size=${store.size}`);

          // Determine owner: use account ID if available, otherwise "admin" if admin
          const owner = authorized.account?.id ||
            (authorized.admin ? "admin" : "unknown");
          if (owner === "unknown") {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          await oxigraphService.setStore(worldId, owner, store);
          if (authorized.account) {
            const timestamp = Date.now();
            const id = ulid(timestamp);
            await usageService.meter({
              id,
              timestamp,
              accountId: authorized.account.id,
              endpoint: "PUT /worlds/{worldId}",
              params: { worldId },
              statusCode: 204,
            });
          }
          return new Response(null, { status: 204 });
        } catch (error) {
          return Response.json(
            { error: "Invalid RDF Syntax", details: String(error) },
            { status: 400 },
          );
        }
      },
    )
    .post(
      "/v1/worlds/:world",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);

        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        if (!authorized.admin && !authorized.account) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Check if world already exists
        const existingMetadata = await oxigraphService.getMetadata(worldId);

        // For existing worlds, verify access
        if (existingMetadata) {
          if (
            !authorized.admin &&
            !authorized.account?.accessControl.worlds.includes(worldId)
          ) {
            // Privacy: Return 404 instead of 401 to hide existence
            return new Response("World not found", { status: 404 });
          }
        } else {
          // For new worlds, check plan limits (skip for admin)
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

            // Add world to account's access control
            await accountsService.addWorldAccess(
              authorized.account.id,
              worldId,
            );
            authorized.account.accessControl.worlds.push(worldId);
          }
        }

        const contentType = ctx.request.headers.get("Content-Type");

        if (!contentType) {
          return Response.json({ error: "Content-Type required" }, {
            status: 400,
          });
        }

        if (!isDecodableEncoding(contentType)) {
          return Response.json({ error: "Unsupported Content-Type" }, {
            status: 400,
          });
        }

        const bodyText = await ctx.request.text();

        try {
          const stream = new Blob([bodyText]).stream();
          const store = await decodeStore(
            stream,
            contentType as DecodableEncoding,
          );

          // Determine owner: use account ID if available, otherwise "admin" if admin
          const owner = authorized.account?.id ||
            (authorized.admin ? "admin" : "unknown");
          if (owner === "unknown") {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          await oxigraphService.addQuads(worldId, owner, store.match());
          if (authorized.account) {
            const timestamp = Date.now();
            const id = ulid(timestamp);
            await usageService.meter({
              id,
              timestamp,
              accountId: authorized.account.id,
              endpoint: "POST /worlds/{worldId}",
              params: { worldId },
              statusCode: 204,
            });
          }
          return new Response(null, { status: 204 });
        } catch (error) {
          return Response.json(
            { error: "Invalid RDF Syntax", details: String(error) },
            { status: 400 },
          );
        }
      },
    )
    .delete(
      "/v1/worlds/:world",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);

        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        // Get world metadata to check ownership
        const metadata = await oxigraphService.getMetadata(worldId);

        // Privacy check: verify access list first
        if (
          !authorized.admin &&
          !authorized.account?.accessControl.worlds.includes(worldId)
        ) {
          return new Response("World not found", { status: 404 });
        }

        if (!metadata) {
          return new Response("World not found", { status: 404 });
        }

        // Only allow deletion by owner or admin
        if (!authorized.admin) {
          if (
            !authorized.account ||
            metadata.createdBy !== authorized.account.id
          ) {
            return Response.json(
              {
                error: "Forbidden: Only the world owner can delete this world",
              },
              { status: 403 },
            );
          }
        }

        await oxigraphService.removeStore(worldId);
        if (authorized.account) {
          const timestamp = Date.now();
          const id = ulid(timestamp);
          await usageService.meter({
            id,
            timestamp,
            accountId: authorized.account.id,
            endpoint: "DELETE /worlds/{worldId}",
            params: { worldId },
            statusCode: 204,
          });
        }

        // Remove from account's access control
        if (authorized.account) {
          try {
            await accountsService.removeWorldAccess(
              authorized.account.id,
              worldId,
            );
          } catch {
            // Ignore if already removed or account not found
          }
        }

        return new Response(null, { status: 204 });
      },
    )
    .get(
      "/v1/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);

        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (authorized.admin) {
          // Admin implementation: list all worlds? Or require filtering?
          // SDK behavior implies getting "my worlds".
          // But for admin, maybe all?
          // The SDK method implies user context.
          // Let's assume listing *owned* worlds if account context exists.
          if (authorized.account) {
            const metadata = await oxigraphService.getManyMetadata(
              authorized.account.accessControl.worlds,
            );
            return Response.json(
              metadata
                .filter((world) => world !== null)
                .toSorted((a, b) => b.updatedAt - a.updatedAt),
            );
          }
          // If admin but not authenticated as a specific account context (service account admin?)
          // Return 400 or list of ALL stores (dangerous?).
          // Let's return empty or all?
          // accountsService.listAccounts() exists.
          // OxigraphService.listStores() exists.
          const allStores = await oxigraphService.listStores();
          const metadata = await oxigraphService.getManyMetadata(allStores);
          return Response.json(
            metadata
              .filter((world) => world !== null)
              .toSorted((a, b) => b.updatedAt - a.updatedAt),
          );
        }

        if (!authorized.account) {
          return new Response("Unauthorized", { status: 401 });
        }

        const metadata = await oxigraphService.getManyMetadata(
          authorized.account.accessControl.worlds,
        );
        return Response.json(
          metadata
            .filter((world) => world !== null)
            .toSorted((a, b) => b.updatedAt - a.updatedAt),
        );
      },
    )
    .patch(
      "/v1/worlds/:world",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        // Get world metadata to check ownership
        const metadata = await oxigraphService.getMetadata(worldId);

        // Privacy check: verify access list first
        if (
          !authorized.admin &&
          !authorized.account?.accessControl.worlds.includes(worldId)
        ) {
          return new Response("World not found", { status: 404 });
        }

        if (!metadata) {
          return new Response("World not found", { status: 404 });
        }

        // Only allow update by owner or admin
        if (!authorized.admin) {
          if (
            !authorized.account ||
            metadata.createdBy !== authorized.account.id
          ) {
            return Response.json(
              {
                error: "Forbidden: Only the world owner can update this world",
              },
              { status: 403 },
            );
          }
        }

        try {
          const body = await ctx.request.json();
          if (typeof body.description !== "string") {
            return Response.json(
              { error: "Description must be a string" },
              { status: 400 },
            );
          }

          await oxigraphService.updateDescription(worldId, body.description);

          if (authorized.account) {
            const timestamp = Date.now();
            const id = ulid(timestamp);
            await usageService.meter({
              id,
              timestamp,
              accountId: authorized.account.id,
              endpoint: "PATCH /worlds/{worldId}",
              params: { worldId },
              statusCode: 204,
            });
          }

          return new Response(null, { status: 204 });
        } catch (_) {
          return Response.json(
            { error: "Invalid JSON" },
            { status: 400 },
          );
        }
      },
    )
    .get(
      "/v1/worlds/:world/statements",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
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
          return new Response("Query required", { status: 400 });
        }

        const results = await oxigraphService.searchStatements(worldId, query);
        return Response.json(results);
      },
    )
    .get(
      "/v1/worlds/:world/statements/:statement",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldId = ctx.params?.pathname.groups.world;
        const statementId = ctx.params?.pathname.groups.statement;

        if (!worldId || !statementId) {
          return new Response("World ID and Statement ID required", {
            status: 400,
          });
        }

        if (
          !authorized.admin &&
          !authorized.account?.accessControl.worlds.includes(worldId)
        ) {
          return new Response("World not found", { status: 404 });
        }

        const result = await oxigraphService.getStatement(
          worldId,
          Number(statementId),
        );
        if (!result) {
          return new Response("Statement not found", { status: 404 });
        }
        return Response.json(result);
      },
    )
    .get(
      "/v1/worlds/:world/chunks",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
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
          return new Response("Query required", { status: 400 });
        }

        const results = await oxigraphService.searchChunks(worldId, query);
        return Response.json(results);
      },
    )
    .get(
      "/v1/worlds/:world/chunks/:chunk",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldId = ctx.params?.pathname.groups.world;
        const chunkId = ctx.params?.pathname.groups.chunk;

        if (!worldId || !chunkId) {
          return new Response("World ID and Chunk ID required", {
            status: 400,
          });
        }

        if (
          !authorized.admin &&
          !authorized.account?.accessControl.worlds.includes(worldId)
        ) {
          return new Response("World not found", { status: 404 });
        }

        const result = await oxigraphService.getChunk(worldId, Number(chunkId));
        if (!result) {
          return new Response("Chunk not found", { status: 404 });
        }
        return Response.json(result);
      },
    );
};
