import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import { LibsqlSearchStoreManager } from "#/server/search/libsql.ts";
import {
  createWorldParamsSchema,
  updateWorldParamsSchema,
} from "#/server/schemas.ts";
import { getPlanPolicy, getPolicy } from "#/server/rate-limit/policies.ts";
import { Parser, Store, Writer } from "n3";
import { TokenBucketRateLimiter } from "#/server/rate-limit/rate-limiter.ts";
import {
  deleteWorld,
  insertWorld,
  selectWorldById,
  selectWorldByIdWithBlob,
  selectWorldsByTenantId,
  updateWorld,
} from "#/server/db/resources/worlds/queries.sql.ts";
import {
  worldTableInsertSchema,
  worldTableUpdateSchema,
} from "#/server/db/resources/worlds/schema.ts";

const SERIALIZATIONS: Record<string, { contentType: string; format: string }> =
  {
    "turtle": { contentType: "text/turtle", format: "Turtle" },
    "n-quads": { contentType: "application/n-quads", format: "N-Quads" },
    "n-triples": { contentType: "application/n-triples", format: "N-Triples" },
    "n3": { contentType: "text/n3", format: "N3" },
  };

const DEFAULT_SERIALIZATION = SERIALIZATIONS["n-quads"];

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
        if (!authorized.tenant && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        const result = await appContext.libsqlClient.execute({
          sql: selectWorldById,
          args: [worldId],
        });
        const world = result.rows[0];

        if (
          !world || world.deleted_at != null ||
          (world.tenant_id !== authorized.tenant?.id &&
            !authorized.admin)
        ) {
          return new Response("World not found", { status: 404 });
        }

        // TODO: Respond with different formats based on the relevant HTTP header.

        return Response.json({
          id: world.id,
          tenantId: world.tenant_id,
          label: world.label,
          description: world.description,
          createdAt: world.created_at,
          updatedAt: world.updated_at,
          ...(world.deleted_at ? { deletedAt: world.deleted_at } : {}),
        });
      },
    )
    .get(
      "/v1/worlds/:world/download",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        const worldResult = await appContext.libsqlClient.execute({
          sql: selectWorldByIdWithBlob,
          args: [worldId],
        });
        const world = worldResult.rows[0];

        if (
          !world || world.deleted_at != null ||
          (world.tenant_id !== authorized.tenant?.id &&
            !authorized.admin)
        ) {
          return new Response("World not found", { status: 404 });
        }

        // Apply rate limit
        const plan = authorized.tenant?.value.plan ?? "free";
        const policy = getPolicy(plan, "world_download");
        const rateLimiter = new TokenBucketRateLimiter(appContext.libsqlClient);
        const rateLimitResult = await rateLimiter.consume(
          `${authorized.tenant?.id || "admin"}:world_download`,
          1,
          policy,
        );

        if (!rateLimitResult.allowed) {
          return new Response("Rate limit exceeded", {
            status: 429,
            headers: {
              "X-RateLimit-Limit": policy.capacity.toString(),
              "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
              "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            },
          });
        }

        const url = new URL(ctx.request.url);
        const formatParam = url.searchParams.get("format");
        const acceptHeader = ctx.request.headers.get("Accept");

        let serialization = DEFAULT_SERIALIZATION;
        if (formatParam && SERIALIZATIONS[formatParam]) {
          serialization = SERIALIZATIONS[formatParam];
        } else if (acceptHeader) {
          const match = Object.values(SERIALIZATIONS).find((s) =>
            acceptHeader.includes(s.contentType)
          );
          if (match) {
            serialization = match;
          }
        }

        // worldResult.rows[0] is used to get the world record
        if (!world || !world.blob) {
          return new Response("World data not found", { status: 404 });
        }

        // world.blob is an ArrayBuffer from LibSQL
        const blobData = world.blob as ArrayBuffer;
        const worldString = new TextDecoder().decode(new Uint8Array(blobData));

        // If requested format is already N-Quads (our internal storage format), return as is
        if (serialization.format === "N-Quads") {
          return new Response(worldString, {
            headers: { "Content-Type": serialization.contentType },
          });
        }

        // Otherwise, re-serialize using n3
        try {
          const parser = new Parser({ format: "N-Quads" });
          const quads = parser.parse(worldString);
          const store = new Store();
          store.addQuads(quads);

          const writer = new Writer({ format: serialization.format });
          writer.addQuads(store.getQuads(null, null, null, null));
          const result = await new Promise<string>((resolve, reject) => {
            writer.end((error, result) => {
              if (error) reject(error);
              else resolve(result as string);
            });
          });

          return new Response(result, {
            headers: { "Content-Type": serialization.contentType },
          });
        } catch (error) {
          console.error("Serialization error:", error);
          return new Response("Failed to serialize world data", {
            status: 500,
          });
        }
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
        const worldResult = await appContext.libsqlClient.execute({
          sql: selectWorldByIdWithBlob,
          args: [worldId],
        });
        const world = worldResult.rows[0];

        if (
          !world || world.deleted_at != null ||
          (world.tenant_id !== authorized.tenant?.id &&
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
        const worldUpdate = worldTableUpdateSchema.parse({
          label: data.label ?? world.label,
          description: data.description ?? world.description,
          updated_at: updatedAt,
          blob: world.blob,
        });

        await appContext.libsqlClient.execute({
          sql: updateWorld,
          args: [
            worldUpdate.label ?? world.label,
            worldUpdate.description ?? world.description ?? null,
            worldUpdate.updated_at ?? updatedAt,
            worldUpdate.blob ?? world.blob ?? null,
            worldId,
          ],
        });

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
        const worldResult = await appContext.libsqlClient.execute({
          sql: selectWorldById,
          args: [worldId],
        });
        const world = worldResult.rows[0];

        if (
          !world || world.deleted_at != null ||
          (world.tenant_id !== authorized.tenant?.id &&
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
        await searchStore.deleteWorld(world.tenant_id as string, worldId);

        try {
          // Delete world
          await appContext.libsqlClient.execute({
            sql: deleteWorld,
            args: [worldId],
          });
          return new Response(null, { status: 204 });
        } catch (error) {
          console.error("Failed to delete world:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    )
    .get(
      "/v1/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant) {
          return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(ctx.request.url);
        const pageString = url.searchParams.get("page") ?? "1";
        const pageSizeString = url.searchParams.get("pageSize") ?? "20";
        const page = parseInt(pageString);
        const pageSize = parseInt(pageSizeString);
        const offset = (page - 1) * pageSize;

        const result = await appContext.libsqlClient.execute({
          sql: selectWorldsByTenantId,
          args: [authorized.tenant.id, pageSize, offset],
        });

        return Response.json(
          result.rows.map((row) => ({
            id: row.id,
            tenantId: row.tenant_id,
            label: row.label,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            ...(row.deleted_at ? { deletedAt: row.deleted_at } : {}),
          })),
        );
      },
    )
    .post(
      "/v1/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant) {
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
        const planPolicy = getPlanPolicy(authorized.tenant.value.plan ?? null);

        // Check world limit
        const worldsResult = await appContext.libsqlClient.execute({
          sql: selectWorldsByTenantId,
          args: [authorized.tenant.id, 1000, 0], // Get all worlds to count
        });
        const activeWorlds = worldsResult.rows.filter((w) =>
          w.deleted_at == null
        );

        if (activeWorlds.length >= planPolicy.worldLimits.maxWorlds) {
          return new Response("World limit reached", { status: 403 });
        }

        const now = Date.now();
        const worldId = crypto.randomUUID();

        const world = worldTableInsertSchema.parse({
          id: worldId,
          tenant_id: authorized.tenant!.id,
          label: data.label,
          description: data.description ?? null,
          blob: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        await appContext.libsqlClient.execute({
          sql: insertWorld,
          args: [
            world.id,
            world.tenant_id,
            world.label,
            world.description ?? null,
            world.blob ?? null,
            world.created_at,
            world.updated_at,
            world.deleted_at ?? null,
          ],
        });

        return Response.json({
          id: world.id,
          tenantId: world.tenant_id,
          label: world.label,
          description: world.description,
          createdAt: world.created_at,
          updatedAt: world.updated_at,
          deletedAt: undefined,
        }, { status: 201 });
      },
    );
};
