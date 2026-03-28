import { STATUS_CODE } from "@std/http/status";
import { Router } from "@fartlabs/rt";
import {
  createWorldParamsSchema,
  paginationParamsSchema,
  updateWorldParamsSchema,
  type RdfFormat,
} from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import type { ServerContext } from "#/context.ts";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { handleETagRequest } from "#/lib/http/etag.ts";
import { negotiateSerialization } from "#/lib/rdf/serialization.ts";
import { LocalWorlds } from "#/lib/worlds/core.ts";

export default (appContext: ServerContext) => {
  const worlds = new LocalWorlds(appContext);

  return new Router()
    .get(
      "/worlds/:world",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const world = await worlds.get(worldId);
        if (!world) {
          return ErrorResponse.NotFound("World not found");
        }

        return await handleETagRequest(ctx.request, Response.json(world));
      },
    )
    .get(
      "/worlds/:world/export",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const url = new URL(ctx.request.url);
        const formatParam = url.searchParams.get("format") as RdfFormat | null;

        let serialization;
        if (formatParam) {
          serialization = {
            format: formatParam,
            contentType: formatParam === "turtle" ? "text/turtle" : "application/n-quads",
          };
        } else {
          const negotiated = negotiateSerialization(ctx.request, "n-quads");
          serialization = {
            format: negotiated.format as RdfFormat,
            contentType: negotiated.contentType,
          };
        }

        try {
          const buffer = await worlds.export(worldId, { format: serialization.format });
          return await handleETagRequest(ctx.request, new Response(buffer, {
            headers: { "Content-Type": serialization.contentType },
          }));
        } catch (error) {
          return ErrorResponse.BadRequest(error instanceof Error ? error.message : String(error));
        }
      },
    )
    .post(
      "/worlds/:world/import",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const body = await ctx.request.arrayBuffer();
        const contentType = ctx.request.headers.get("Content-Type") || "";
        const format = contentType.includes("turtle") ? "turtle" : "n-quads";

        try {
          await worlds.import(worldId, body, { format: format as RdfFormat });
          return new Response(null, { status: STATUS_CODE.NoContent });
        } catch (error) {
          return ErrorResponse.BadRequest(error instanceof Error ? error.message : String(error));
        }
      },
    )
    .get(
      "/worlds",
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
        const results = await worlds.list({ page, pageSize });

        return await handleETagRequest(ctx.request, Response.json(results));
      },
    )
    .post(
      "/worlds",
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

        try {
          const world = await worlds.create(parseResult.data);
          return Response.json(world, { status: STATUS_CODE.Created });
        } catch (error) {
          return ErrorResponse.Conflict(error instanceof Error ? error.message : String(error));
        }
      },
    )
    .put(
      "/worlds/:world",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

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

        try {
          await worlds.update(worldId, updateResult.data);
          return new Response(null, { status: STATUS_CODE.NoContent });
        } catch (error) {
          return ErrorResponse.NotFound(error instanceof Error ? error.message : String(error));
        }
      },
    )
    .delete(
      "/worlds/:world",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        try {
          await worlds.delete(worldId);
          return new Response(null, { status: STATUS_CODE.NoContent });
        } catch (error) {
          return ErrorResponse.NotFound(error instanceof Error ? error.message : String(error));
        }
      },
    );
};
