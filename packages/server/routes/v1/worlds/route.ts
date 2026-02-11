import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid/ulid";
import { authorizeRequest } from "#/middleware/auth.ts";
import { checkRateLimit } from "#/middleware/rate-limit.ts";
import type { ServerContext } from "#/context.ts";
import {
  createWorldParamsSchema,
  paginationParamsSchema,
  updateWorldParamsSchema,
  worldSchema,
} from "@wazoo/sdk";
import { Parser, Store, Writer } from "n3";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import type {
  WorldRow,
  WorldTable,
} from "#/lib/database/tables/worlds/schema.ts";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";
import { LogsService } from "#/lib/database/tables/logs/service.ts";
import { BlobsService } from "#/lib/database/tables/blobs/service.ts";
import { handlePatch } from "#/lib/rdf-patch/rdf-patch.ts";

const SERIALIZATIONS: Record<string, { contentType: string; format: string }> =
  {
    "turtle": { contentType: "text/turtle", format: "Turtle" },
    "n-quads": { contentType: "application/n-quads", format: "N-Quads" },
    "n-triples": { contentType: "application/n-triples", format: "N-Triples" },
    "n3": { contentType: "text/n3", format: "N3" },
  };

const DEFAULT_SERIALIZATION = SERIALIZATIONS["n-quads"];

export default (appContext: ServerContext) => {
  const worldsService = new WorldsService(appContext.libsql.database);

  return new Router()
    .get(
      "/v1/worlds/:world",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.organizationId) {
          console.warn("[DEBUG] Unauthorized in worlds/route.ts:", authorized);
          return ErrorResponse.Unauthorized();
        }

        const world = await worldsService.getById(worldId);

        if (!world || world.deleted_at != null) {
          return ErrorResponse.NotFound("World not found");
        }

        if (
          !authorized.admin &&
          authorized.organizationId !== world.organization_id
        ) {
          return ErrorResponse.Forbidden();
        }

        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "worlds_get",
        );
        if (rateLimitRes) return rateLimitRes;

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "worlds_get",
            quantity: 1,
          });
        }

        // Validate SQL result before returning
        // Check if deleted_at is null (service handles this but double checking)
        if (world.deleted_at != null) {
          return ErrorResponse.NotFound("World not found");
        }

        // Map to SDK record and validate against SDK schema
        const record = worldSchema.parse({
          id: world.id,
          organizationId: world.organization_id,
          label: world.label,
          description: world.description,
          createdAt: world.created_at,
          updatedAt: world.updated_at,
          deletedAt: world.deleted_at,
        });

        return Response.json(record);
      },
    )
    .get(
      "/v1/worlds/:world/export",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.organizationId) {
          console.warn("[DEBUG] Unauthorized in worlds/route.ts:", authorized);
          return ErrorResponse.Unauthorized();
        }

        const rawWorld = await worldsService.getById(worldId);

        if (!rawWorld || rawWorld.deleted_at != null) {
          return ErrorResponse.NotFound("World not found");
        }

        if (
          !authorized.admin &&
          authorized.organizationId !== rawWorld.organization_id
        ) {
          return ErrorResponse.Forbidden();
        }

        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "worlds_export",
        );
        if (rateLimitRes) return rateLimitRes;

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "worlds_export",
            quantity: 1,
          });
        }

        const managed = await appContext.libsql.manager.get(worldId);
        const logsService = new LogsService(managed.database);
        await logsService.add({
          id: ulid(),
          world_id: worldId,
          timestamp: Date.now(),
          level: "info",
          message: "World exported",
          metadata: null,
        });

        const blobsService = new BlobsService(managed.database);
        const worldData = await blobsService.get();

        const _world = rawWorld; // Just to ensure it's not null, which we checked above

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

        // worldData.blob is used to get the world record
        if (!worldData || !worldData.blob) {
          return ErrorResponse.NotFound("World data not found");
        }

        const blobData = worldData.blob as unknown as ArrayBuffer;
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
            writer.end((error: Error | null, result: string | undefined) => {
              if (error) {
                reject(error);
              } else {
                resolve(result as string);
              }
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
    .post(
      "/v1/worlds/:world/import",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.organizationId) {
          console.warn("[DEBUG] Unauthorized in worlds/route.ts:", authorized);
          return ErrorResponse.Unauthorized();
        }

        const rawWorld = await worldsService.getById(worldId);

        if (!rawWorld || rawWorld.deleted_at != null) {
          return ErrorResponse.NotFound("World not found");
        }

        if (
          !authorized.admin &&
          authorized.organizationId !== rawWorld.organization_id
        ) {
          return ErrorResponse.Forbidden();
        }

        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "worlds_import",
        );
        if (rateLimitRes) return rateLimitRes;

        const contentType = ctx.request.headers.get("content-type") ||
          "application/n-quads";
        let format = "N-Quads";
        if (contentType.includes("text/turtle")) {
          format = "Turtle";
        } else if (contentType.includes("application/n-triples")) {
          format = "N-Triples";
        } else if (contentType.includes("text/n3")) {
          format = "N3";
        }

        const bodyText = await ctx.request.text();
        const parser = new Parser({ format });
        const quads = parser.parse(bodyText);

        const managed = await appContext.libsql.manager.get(worldId);
        const blobsService = new BlobsService(managed.database);
        const worldData = await blobsService.get();

        const store = new Store();
        if (worldData && worldData.blob) {
          const blobData = worldData.blob as unknown as ArrayBuffer;
          const worldString = new TextDecoder().decode(
            new Uint8Array(blobData),
          );
          const existingQuads = new Parser({ format: "N-Quads" }).parse(
            worldString,
          );
          store.addQuads(existingQuads);
        }

        store.addQuads(quads);

        const writer = new Writer({ format: "N-Quads" });
        writer.addQuads(store.getQuads(null, null, null, null));
        const newWorldString = await new Promise<string>((resolve, reject) => {
          writer.end((error: Error | null, result: string | undefined) => {
            if (error) {
              reject(error);
            } else {
              resolve(result as string);
            }
          });
        });

        const now = Date.now();
        await blobsService.set(
          new TextEncoder().encode(newWorldString),
          now,
        );

        // Index new triples for semantic search
        await handlePatch(managed.database, appContext.embeddings, [
          { insertions: quads, deletions: [] },
        ]);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "worlds_import",
            quantity: 1,
          });
        }

        const logsService = new LogsService(managed.database);
        await logsService.add({
          id: ulid(),
          world_id: worldId,
          timestamp: Date.now(),
          level: "info",
          message: "World data imported",
          metadata: {
            format,
            tripleCount: quads.length,
          },
        });

        return new Response(null, { status: 204 });
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
        if (!authorized.admin && !authorized.organizationId) {
          console.warn("[DEBUG] Unauthorized in worlds/route.ts:", authorized);
          return ErrorResponse.Unauthorized();
        }

        const rawWorld = await worldsService.getById(worldId);

        if (!rawWorld || rawWorld.deleted_at != null) {
          return ErrorResponse.NotFound("World not found");
        }

        if (
          !authorized.admin &&
          authorized.organizationId !== rawWorld.organization_id
        ) {
          return ErrorResponse.Forbidden();
        }

        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "worlds_update",
        );
        if (rateLimitRes) return rateLimitRes;

        // Validate SQL result
        const _world = rawWorld;

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
              parseResult.error.issues.map((e: { message: string }) =>
                e.message
              ).join(", "),
          );
        }
        const data = parseResult.data;

        const updatedAt = Date.now();
        await worldsService.update(worldId, {
          label: data.label,
          description: data.description,
          updated_at: updatedAt,
        });

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "worlds_update",
            quantity: 1,
          });
        }

        const managed = await appContext.libsql.manager.get(worldId);
        const logsService = new LogsService(managed.database);
        await logsService.add({
          id: ulid(),
          world_id: worldId,
          timestamp: Date.now(),
          level: "info",
          message: "World updated",
          metadata: {
            label: data.label,
            description: data.description,
          },
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
        if (!authorized.admin && !authorized.organizationId) {
          console.warn("[DEBUG] Unauthorized in worlds/route.ts:", authorized);
          return ErrorResponse.Unauthorized();
        }

        const rawWorld = await worldsService.getById(worldId);

        if (!rawWorld || rawWorld.deleted_at != null) {
          return ErrorResponse.NotFound("World not found");
        }

        if (
          !authorized.admin &&
          authorized.organizationId !== rawWorld.organization_id
        ) {
          return ErrorResponse.Forbidden();
        }

        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "worlds_delete",
        );
        if (rateLimitRes) return rateLimitRes;

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "worlds_delete",
            quantity: 1,
          });
        }

        const _world = rawWorld;

        try {
          const managed = await appContext.libsql.manager.get(worldId);
          const logsService = new LogsService(managed.database);
          await logsService.add({
            id: ulid(),
            world_id: worldId,
            timestamp: Date.now(),
            level: "info",
            message: "World deleted",
            metadata: null,
          });
        } catch (error) {
          console.error("Failed to log world deletion:", error);
        }

        if (appContext.libsql.manager) {
          try {
            // Database ID is the same as World ID
            await appContext.libsql.manager.delete(worldId);
          } catch (error) {
            console.error("Failed to delete Turso database:", error);
          }
        }

        try {
          // Delete world
          await worldsService.delete(worldId);

          return new Response(null, { status: 204 });
        } catch (error) {
          console.error("Failed to delete world metadata:", error);
          return ErrorResponse.InternalServerError();
        }
      },
    )
    .get(
      "/v1/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.organizationId) {
          console.warn("[DEBUG] Unauthorized in worlds/route.ts:", authorized);
          return ErrorResponse.Unauthorized();
        }

        const url = new URL(ctx.request.url);
        // Admin must specify organizationId, service account uses its own
        let organizationId = url.searchParams.get("organizationId");
        if (!authorized.admin && authorized.organizationId) {
          organizationId = authorized.organizationId;
        }

        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "worlds_list",
        );
        if (rateLimitRes) return rateLimitRes;

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "worlds_list",
            quantity: 1,
          });
        }

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
              paginationResult.error.issues.map((e: { message: string }) =>
                e.message
              ).join(", "),
          );
        }

        const { page, pageSize } = paginationResult.data;
        const offset = (page - 1) * pageSize;

        const rows = organizationId
          ? await worldsService.getByOrganizationId(
            organizationId,
            pageSize,
            offset,
          )
          : await worldsService.listAll(pageSize, offset);

        // Validate each SQL result row
        const validatedRows = rows.map((row: WorldRow) => {
          const validated = row;

          return worldSchema.parse({
            id: validated.id,
            organizationId: validated.organization_id,
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
        if (!authorized.admin && !authorized.organizationId) {
          console.warn("[DEBUG] Unauthorized in worlds/route.ts:", authorized);
          return ErrorResponse.Unauthorized();
        }

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }

        const result = createWorldParamsSchema.safeParse(body);
        if (!result.success) {
          console.warn(
            "[DEBUG] Validation error in POST /v1/worlds:",
            result.error.format(),
          );
          return ErrorResponse.BadRequest(
            "Invalid request body: " + result.error.message,
          );
        }
        const data = result.data;
        const organizationId = data.organizationId ?? authorized.organizationId;

        if (
          !authorized.admin && organizationId !== authorized.organizationId
        ) {
          return ErrorResponse.Forbidden(
            "Cannot create world for another organization",
          );
        }

        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "worlds_create",
        );
        if (rateLimitRes) return rateLimitRes;

        const now = Date.now();
        const worldId = ulid();

        let _dbId: string | null = null;
        const dbHostname: string | null = null; // Stored as null, use LibsqlManager.get()
        const dbToken: string | null = null; // Stored as null, use LibsqlManager.get()

        if (appContext.libsql.manager) {
          try {
            const { database: client } = await appContext.libsql.manager
              .create(worldId);
            _dbId = worldId; // The ID passed to create is the database ID

            const { initializeWorldDatabase } = await import(
              "#/lib/database/init.ts"
            );
            await initializeWorldDatabase(
              client,
              appContext.embeddings.dimensions,
            );
          } catch (error) {
            console.error("Failed to provision Turso database:", error);
            return ErrorResponse.InternalServerError(
              "Failed to provision world database",
            );
          }
        }

        const world: WorldTable = {
          id: worldId,
          organization_id: organizationId ?? null,
          label: data.label,
          description: data.description ?? null,
          db_hostname: dbHostname,
          db_token: dbToken,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };

        await worldsService.insert(world);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "worlds_create",
            quantity: 1,
          });
        }

        const managed = await appContext.libsql.manager.get(worldId);
        const logsService = new LogsService(managed.database);
        await logsService.add({
          id: ulid(),
          world_id: worldId,
          timestamp: Date.now(),
          level: "info",
          message: "World created",
          metadata: {
            label: world.label,
          },
        });

        const record = worldSchema.parse({
          id: world.id,
          organizationId: world.organization_id,
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
