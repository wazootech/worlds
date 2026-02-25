import { STATUS_CODE } from "@std/http/status";
import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid/ulid";
import { type AuthorizedRequest, authorizeRequest } from "#/middleware/auth.ts";

import type { ServerContext } from "#/context.ts";
import {
  createWorldParamsSchema,
  paginationParamsSchema,
  updateWorldParamsSchema,
  worldSchema,
} from "@wazoo/sdk";
import { Parser, Store, Writer } from "n3";
import {
  DEFAULT_SERIALIZATION,
  getSerializationByContentType,
  getSerializationByFormat,
  negotiateSerialization,
  SERIALIZATIONS,
} from "#/lib/rdf/serialization.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import type {
  WorldRow,
  WorldTable,
} from "#/lib/database/tables/worlds/schema.ts";
import { ErrorResponse } from "#/lib/errors/errors.ts";

import { LogsService } from "#/lib/database/tables/logs/service.ts";
import { BlobsService } from "#/lib/database/tables/blobs/service.ts";
import { handlePatch } from "#/lib/rdf-patch/rdf-patch.ts";
import { handleETagRequest } from "#/lib/http/etag.ts";

export default (appContext: ServerContext) => {
  const worldsService = new WorldsService(appContext.libsql.database);

  /**
   * resolveWorld resolves a world by ID or slug and checks authorization.
   * Returns the world row if successful, or a Response if an error occurs.
   */
  async function resolveWorld(
    worldIdOrSlug: string,
    authorized: AuthorizedRequest,
  ): Promise<WorldRow | Response> {
    // Resolve world by ID first
    let world = await worldsService.getById(worldIdOrSlug);

    if (!world) {
      // If not found by ID, try finding by slug
      // We pass null for organizationId because slugs are now globally unique
      world = await worldsService.getBySlug(worldIdOrSlug);
    }

    if (!world || world.deleted_at != null) {
      return ErrorResponse.NotFound("World not found");
    }

    // Authorization check
    if (!authorized.admin) {
      // Return 404 to hide existence
      return ErrorResponse.NotFound("World not found");
    }

    return world;
  }

  return new Router()
    .get(
      "/v1/worlds/:world",
      async (ctx) => {
        const worldParam = ctx.params?.pathname.groups.world;
        if (!worldParam) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const world = await resolveWorld(worldParam, authorized);
        if (world instanceof Response) return world;

        // Map to SDK record and validate against SDK schema
        const record = worldSchema.parse({
          id: world.id,
          organizationId: null,
          slug: world.slug,
          label: world.label,
          description: world.description,
          createdAt: world.created_at,
          updatedAt: world.updated_at,
          deletedAt: world.deleted_at,
        });

        return await handleETagRequest(ctx.request, Response.json(record));
      },
    )
    .get(
      "/v1/worlds/:world/export",
      async (ctx) => {
        const worldParam = ctx.params?.pathname.groups.world;
        if (!worldParam) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const world = await resolveWorld(worldParam, authorized);
        if (world instanceof Response) return world;

        const url = new URL(ctx.request.url);
        const formatParam = url.searchParams.get("format");

        let serialization = DEFAULT_SERIALIZATION;
        if (formatParam) {
          const s = getSerializationByFormat(formatParam);
          if (!s) {
            return ErrorResponse.BadRequest(
              `Unsupported format: ${formatParam}. Supported: ${
                Object.keys(SERIALIZATIONS).join(", ")
              }`,
            );
          }
          serialization = s;
        } else {
          // If no format parameter, use content negotiation
          serialization = negotiateSerialization(ctx.request, "n-quads");
        }

        const managed = await appContext.libsql.manager.get(world.id);
        const blobsService = new BlobsService(managed.database);
        const worldData = await blobsService.get();

        if (!worldData) {
          return new Response("", {
            headers: { "Content-Type": serialization.contentType },
          });
        }

        const blobData = worldData.blob as unknown as ArrayBuffer;
        if (serialization.format === DEFAULT_SERIALIZATION.format) {
          return new Response(blobData, {
            headers: { "Content-Type": serialization.contentType },
          });
        }

        const quads = new TextDecoder().decode(blobData);
        const parser = new Parser({ format: "N-Quads" });
        const store = new Store();
        store.addQuads(parser.parse(quads));

        const writer = new Writer({ format: serialization.format });
        writer.addQuads(store.getQuads(null, null, null, null));

        return new Promise((resolve, reject) => {
          writer.end(async (error, result) => {
            if (error) reject(error);
            else {
              const response = new Response(result, {
                headers: { "Content-Type": serialization.contentType },
              });
              resolve(await handleETagRequest(ctx.request, response));
            }
          });
        });
      },
    )
    .post(
      "/v1/worlds/:world/import",
      async (ctx) => {
        const worldParam = ctx.params?.pathname.groups.world;
        if (!worldParam) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const world = await resolveWorld(worldParam, authorized);
        if (world instanceof Response) return world;

        const contentType = ctx.request.headers.get("Content-Type") || "";
        const serialization = getSerializationByContentType(contentType) ??
          DEFAULT_SERIALIZATION;
        const format = serialization.format;

        const body = await ctx.request.text();
        const parser = new Parser({ format });
        const store = new Store();
        try {
          store.addQuads(parser.parse(body));
        } catch (error) {
          return ErrorResponse.BadRequest(
            `Invalid RDF data: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }

        const writer = new Writer({ format: "N-Quads" });
        writer.addQuads(store.getQuads(null, null, null, null));

        return new Promise((resolve, reject) => {
          writer.end(async (error, result) => {
            if (error) reject(error);
            else {
              try {
                const managed = await appContext.libsql.manager.get(world.id);
                const blobsService = new BlobsService(managed.database);
                const now = Date.now();

                // Generate and commit patches for the search index
                await handlePatch(
                  managed.database,
                  appContext.embeddings,
                  [{
                    insertions: store.getQuads(null, null, null, null),
                    deletions: [],
                  }],
                );

                await blobsService.set(new TextEncoder().encode(result), now);
                await worldsService.update(world.id, { updated_at: now });

                const logsService = new LogsService(managed.database);
                await logsService.add({
                  id: ulid(),
                  world_id: world.id,
                  timestamp: now,
                  level: "info",
                  message: "World data imported",
                  metadata: { triples: store.size },
                });

                resolve(new Response(null, { status: STATUS_CODE.NoContent }));
              } catch (e) {
                reject(e);
              }
            }
          });
        });
      },
    )
    .get(
      "/v1/worlds",
      async (ctx) => {
        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const url = new URL(ctx.request.url);
        const pageString = url.searchParams.get("page") ?? "1";
        const pageSizeString = url.searchParams.get("pageSize") ?? "20";
        const paginationResult = paginationParamsSchema.safeParse({
          page: parseInt(pageString),
          pageSize: parseInt(pageSizeString),
        });

        if (!paginationResult.success) {
          return ErrorResponse.BadRequest("Invalid pagination parameters");
        }

        const { page, pageSize } = paginationResult.data;
        const offset = (page - 1) * pageSize;

        const rows = await worldsService.listAll(pageSize, offset);

        const response = Response.json(
          rows.map((world: WorldRow) => ({
            id: world.id,
            organizationId: null,
            slug: world.slug,
            label: world.label,
            description: world.description,
            createdAt: world.created_at,
            updatedAt: world.updated_at,
            deletedAt: world.deleted_at,
          })),
        );

        return await handleETagRequest(ctx.request, response);
      },
    )
    .post(
      "/v1/worlds",
      async (ctx) => {
        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Forbidden("Only admins can create worlds");
        }

        const body = await ctx.request.json();
        const parseResult = createWorldParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest("Invalid parameters");
        }

        const data = parseResult.data;
        const id = (body as { id?: string }).id ?? ulid();
        const { slug, label, description } = data;

        // Check if slug already exists globally
        const existingBySlug = await worldsService.getBySlug(slug);
        if (existingBySlug) {
          return ErrorResponse.Conflict("World slug already exists");
        }

        const now = Date.now();
        const world: WorldTable = {
          id,
          slug,
          label,
          description: description ?? null,
          db_hostname: null,
          db_token: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };

        await worldsService.insert(world);
        await appContext.libsql.manager.create(id);

        return Response.json(
          worldSchema.parse({
            id: world.id,
            organizationId: null,
            slug: world.slug,
            label: world.label,
            description: world.description,
            createdAt: world.created_at,
            updatedAt: world.updated_at,
            deletedAt: world.deleted_at,
          }),
          { status: STATUS_CODE.Created },
        );
      },
    )
    .put(
      "/v1/worlds/:world",
      async (ctx) => {
        const worldParam = ctx.params?.pathname.groups.world;
        if (!worldParam) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const world = await resolveWorld(worldParam, authorized);
        if (world instanceof Response) return world;

        let body: unknown;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }

        const updateResult = updateWorldParamsSchema.safeParse(body);
        if (!updateResult.success) {
          return ErrorResponse.BadRequest("Invalid parameters");
        }

        const data = updateResult.data;
        await worldsService.update(world.id, {
          slug: data.slug ?? world.slug,
          label: data.label ?? world.label,
          description: data.description !== undefined
            ? data.description
            : world.description,
          updated_at: Date.now(),
        });

        return new Response(null, { status: STATUS_CODE.NoContent });
      },
    )
    .delete(
      "/v1/worlds/:world",
      async (ctx) => {
        const worldParam = ctx.params?.pathname.groups.world;
        if (!worldParam) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const world = await resolveWorld(worldParam, authorized);
        if (world instanceof Response) return world;

        // Perform soft delete
        await worldsService.update(world.id, {
          deleted_at: Date.now(),
        });

        return new Response(null, { status: STATUS_CODE.NoContent });
      },
    );
};
