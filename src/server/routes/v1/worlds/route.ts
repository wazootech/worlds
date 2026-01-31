import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import { LibsqlSearchStoreManager } from "#/server/search/libsql.ts";
import {
  createWorldParamsSchema,
  paginationParamsSchema,
  updateWorldParamsSchema,
  worldRecordSchema,
} from "#/sdk/schema.ts";
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
  worldRowSchema,
  worldTableInsertSchema,
  worldTableSchema,
  worldTableUpdateSchema,
} from "#/server/db/resources/worlds/schema.ts";
import { ErrorResponse } from "#/server/errors.ts";

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
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
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
          return ErrorResponse.NotFound("World not found");
        }

        // Validate SQL result before returning
        const row = worldRowSchema.parse({
          id: world.id,
          tenant_id: world.tenant_id,
          label: world.label,
          description: world.description,
          created_at: world.created_at,
          updated_at: world.updated_at,
          deleted_at: world.deleted_at,
        });

        // Map to SDK record and validate against SDK schema
        const record = worldRecordSchema.parse({
          id: row.id,
          tenantId: row.tenant_id,
          label: row.label,
          description: row.description,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
        });

        return Response.json(record);
      },
    )
    .get(
      "/v1/worlds/:world/download",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const worldResult = await appContext.libsqlClient.execute({
          sql: selectWorldByIdWithBlob,
          args: [worldId],
        });
        const rawWorld = worldResult.rows[0];

        if (
          !rawWorld || rawWorld.deleted_at != null ||
          (rawWorld.tenant_id !== authorized.tenant?.id &&
            !authorized.admin)
        ) {
          return ErrorResponse.NotFound("World not found");
        }

        // Validate SQL result
        const world = worldTableSchema.parse({
          id: rawWorld.id,
          tenant_id: rawWorld.tenant_id,
          label: rawWorld.label,
          description: rawWorld.description,
          blob: rawWorld.blob,
          created_at: rawWorld.created_at,
          updated_at: rawWorld.updated_at,
          deleted_at: rawWorld.deleted_at,
        });

        // Apply rate limit
        const plan = authorized.tenant?.plan ?? "free";
        const policy = getPolicy(plan, "world_download");
        const rateLimiter = new TokenBucketRateLimiter(appContext.libsqlClient);
        const rateLimitResult = await rateLimiter.consume(
          `${authorized.tenant?.id || "admin"}:world_download`,
          1,
          policy,
        );

        if (!rateLimitResult.allowed) {
          return ErrorResponse.RateLimitExceeded("Rate limit exceeded", {
            "X-RateLimit-Limit": policy.capacity.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
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
          return ErrorResponse.NotFound("World data not found");
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
          return ErrorResponse.InternalServerError(
            "Failed to serialize world data",
          );
        }
      },
    )
    .put(
      "/v1/worlds/:world",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        const worldResult = await appContext.libsqlClient.execute({
          sql: selectWorldByIdWithBlob,
          args: [worldId],
        });
        const rawWorld = worldResult.rows[0];

        if (
          !rawWorld || rawWorld.deleted_at != null ||
          (rawWorld.tenant_id !== authorized.tenant?.id &&
            !authorized.admin)
        ) {
          return ErrorResponse.NotFound("World not found");
        }

        // Validate SQL result
        const world = worldTableSchema.parse({
          id: rawWorld.id,
          tenant_id: rawWorld.tenant_id,
          label: rawWorld.label,
          description: rawWorld.description,
          blob: rawWorld.blob,
          created_at: rawWorld.created_at,
          updated_at: rawWorld.updated_at,
          deleted_at: rawWorld.deleted_at,
        });

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }

        const parseResult = updateWorldParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid parameters: " +
              parseResult.error.issues.map((e) => e.message).join(", "),
          );
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
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        const worldResult = await appContext.libsqlClient.execute({
          sql: selectWorldById,
          args: [worldId],
        });
        const rawWorld = worldResult.rows[0];

        if (
          !rawWorld || rawWorld.deleted_at != null ||
          (rawWorld.tenant_id !== authorized.tenant?.id &&
            !authorized.admin)
        ) {
          return ErrorResponse.NotFound("World not found");
        }

        // Validate SQL result
        const world = worldRowSchema.parse({
          id: rawWorld.id,
          tenant_id: rawWorld.tenant_id,
          label: rawWorld.label,
          description: rawWorld.description,
          created_at: rawWorld.created_at,
          updated_at: rawWorld.updated_at,
          deleted_at: rawWorld.deleted_at,
        });

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
          return ErrorResponse.InternalServerError();
        }
      },
    )
    .get(
      "/v1/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant) {
          return ErrorResponse.Unauthorized();
        }

        const url = new URL(ctx.request.url);
        const pageString = url.searchParams.get("page") ?? "1";
        const pageSizeString = url.searchParams.get("pageSize") ?? "20";

        // Validate pagination parameters
        const paginationResult = paginationParamsSchema.safeParse({
          page: parseInt(pageString),
          pageSize: parseInt(pageSizeString),
        });

        if (!paginationResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid pagination parameters: " +
              paginationResult.error.issues.map((e) => e.message).join(", "),
          );
        }

        const { page, pageSize } = paginationResult.data;
        const offset = (page - 1) * pageSize;

        const result = await appContext.libsqlClient.execute({
          sql: selectWorldsByTenantId,
          args: [authorized.tenant.id, pageSize, offset],
        });

        // Validate each SQL result row
        const validatedRows = result.rows.map((row) => {
          const validated = worldRowSchema.parse({
            id: row.id,
            tenant_id: row.tenant_id,
            label: row.label,
            description: row.description,
            created_at: row.created_at,
            updated_at: row.updated_at,
            deleted_at: row.deleted_at,
          });

          return worldRecordSchema.parse({
            id: validated.id,
            tenantId: validated.tenant_id,
            label: validated.label,
            description: validated.description,
            createdAt: validated.created_at,
            updatedAt: validated.updated_at,
            deletedAt: validated.deleted_at,
          });
        });

        return Response.json(validatedRows);
      },
    )
    .post(
      "/v1/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant) {
          return ErrorResponse.Unauthorized();
        }

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }

        const parseResult = createWorldParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid parameters: " +
              parseResult.error.issues.map((e) => e.message).join(", "),
          );
        }
        const data = parseResult.data;
        const planPolicy = getPlanPolicy(authorized.tenant.plan ?? null);

        // Check world limit
        const worldsResult = await appContext.libsqlClient.execute({
          sql: selectWorldsByTenantId,
          args: [authorized.tenant.id, 1000, 0], // Get all worlds to count
        });
        const activeWorlds = worldsResult.rows.filter((w) =>
          w.deleted_at == null
        );

        if (activeWorlds.length >= planPolicy.worldLimits.maxWorlds) {
          return ErrorResponse.Forbidden("World limit reached");
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

        const record = worldRecordSchema.parse({
          id: world.id,
          tenantId: world.tenant_id,
          label: world.label,
          description: world.description,
          createdAt: world.created_at,
          updatedAt: world.updated_at,
          deletedAt: world.deleted_at,
        });

        return Response.json(record, { status: 201 });
      },
    );
};
