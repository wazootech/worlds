import { STATUS_CODE } from "@std/http/status";
import { Router } from "@fartlabs/rt";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { handleETagRequest } from "#/utils/http/etag.ts";
import { negotiateSerialization } from "#/utils/http/negotiation.ts";
import {
  worldsCreateInputSchema,
  worldsListInputSchema,
  worldsUpdateInputSchema,
} from "@wazoo/worlds-sdk";
import type { WorldsContentType, WorldsContext } from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";


/**
 * worldsRouter creates a router for the Worlds API.
 */
export default (appContext: WorldsContext) => {
  return new Router()
    .get(
      "/worlds/:slug",
      async (ctx) => {
        const slug = ctx.params?.pathname.groups.slug;
        if (!slug) {
          return ErrorResponse.BadRequest("World slug required");
        }

        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin && !authorized.namespaceId) {
          return ErrorResponse.Unauthorized();
        }

        const engine = getNamespacedEngine(appContext, authorized.namespaceId);
        const world = await engine.get({
          source: slug,
        });
        if (!world) {
          return ErrorResponse.NotFound("World not found");
        }

        return await handleETagRequest(ctx.request, Response.json(world));
      },
    )
    .post(
      "/export",
      async (ctx) => {
        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin && !authorized.namespaceId) {
          return ErrorResponse.Unauthorized();
        }

        const body = await ctx.request.json();
        const { slug, contentType: contentTypeParam } = body;
        if (!slug) {
          return ErrorResponse.BadRequest("World slug required");
        }

        let serialization;
        if (contentTypeParam) {
          serialization = {
            contentType: contentTypeParam as WorldsContentType,
          };
        } else {
          const negotiated = negotiateSerialization(
            ctx.request,
            "application/n-quads",
          );
          serialization = {
            contentType: negotiated.contentType as WorldsContentType,
          };
        }

        try {
          const engine = getNamespacedEngine(
            appContext,
            authorized.namespaceId,
          );
          const buffer = await engine.export({
            source: body.source ?? body.slug ?? slug,
            contentType: serialization.contentType,
          });
          return await handleETagRequest(
            ctx.request,
            new Response(buffer, {
              headers: { "Content-Type": serialization.contentType as string },
            }),
          );
        } catch (error) {
          return ErrorResponse.BadRequest(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    )
    .post(
      "/import",
      async (ctx) => {
        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin && !authorized.namespaceId) {
          return ErrorResponse.Unauthorized();
        }

        const body = await ctx.request.json();
        const { slug, data, contentType = "application/n-quads" } = body;
        if (!slug) {
          return ErrorResponse.BadRequest("World slug required");
        }
        if (!data) {
          return ErrorResponse.BadRequest("Import data required");
        }

        // Convert base64 data to ArrayBuffer
        const binaryData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
          .buffer;

        try {
          const engine = getNamespacedEngine(
            appContext,
            authorized.namespaceId,
          );
          await engine.import({
            source: body.source ?? body.slug ?? slug,
            data: binaryData as ArrayBuffer,
            contentType: contentType as WorldsContentType,
          });
          return new Response(null, { status: STATUS_CODE.NoContent });
        } catch (error) {
          return ErrorResponse.BadRequest(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    )
    .get(
      "/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin && !authorized.namespaceId) {
          return ErrorResponse.Unauthorized();
        }

        const url = new URL(ctx.request.url);
        const pageString = url.searchParams.get("page") ?? "1";
        const pageSizeString = url.searchParams.get("pageSize") ?? "20";
        const paginationResult = worldsListInputSchema.safeParse({
          page: parseInt(pageString),
          pageSize: parseInt(pageSizeString),
        });

        if (!paginationResult.success) {
          return ErrorResponse.BadRequest("Invalid pagination parameters");
        }

        const { page, pageSize } = paginationResult.data;
        const engine = getNamespacedEngine(appContext, authorized.namespaceId);
        const results = await engine.list({
          page,
          pageSize,
          namespace: authorized.namespaceId,
        });

        return await handleETagRequest(ctx.request, Response.json(results));
      },
    )
    .post(
      "/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        // Only admins or users with a namespace can create worlds (in their namespace)
        if (!authorized.admin && !authorized.namespaceId) {
          return ErrorResponse.Forbidden("Forbidden");
        }

        const body = await ctx.request.json();
        const parseResult = worldsCreateInputSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest("Invalid parameters");
        }

        try {
          const engine = getNamespacedEngine(
            appContext,
            authorized.namespaceId,
          );
          const world = await engine.create({
            ...parseResult.data,
            namespace: authorized.namespaceId,
          });
          return Response.json(world, { status: STATUS_CODE.Created });
        } catch (error) {
          return ErrorResponse.Conflict(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    )
    .put(
      "/worlds/:slug",
      async (ctx) => {
        const slug = ctx.params?.pathname.groups.slug;
        if (!slug) {
          return ErrorResponse.BadRequest("World slug required");
        }

        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin && !authorized.namespaceId) {
          return ErrorResponse.Unauthorized();
        }

        let body: unknown;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }

        const updateResult = worldsUpdateInputSchema.safeParse({
          ...body as object,
          source: (body as any).source ?? (body as any).slug ?? slug,
        });
        if (!updateResult.success) {
          console.error("Update validation failed:", updateResult.error);
          return ErrorResponse.BadRequest("Invalid parameters");
        }

        try {
          const engine = getNamespacedEngine(
            appContext,
            authorized.namespaceId,
          );
          await engine.update(updateResult.data);
          return new Response(null, { status: STATUS_CODE.NoContent });
        } catch (error) {
          return ErrorResponse.NotFound(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    )
    .delete(
      "/worlds/:slug",
      async (ctx) => {
        const slug = ctx.params?.pathname.groups.slug;
        if (!slug) {
          return ErrorResponse.BadRequest("World slug required");
        }

        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin && !authorized.namespaceId) {
          return ErrorResponse.Unauthorized();
        }

        try {
          const body = await ctx.request.json().catch(() => ({}));
          const engine = getNamespacedEngine(
            appContext,
            authorized.namespaceId,
          );
          await engine.delete({
            source: (body as any).source ?? (body as any).slug ?? slug,
          });
          return new Response(null, { status: STATUS_CODE.NoContent });
        } catch (error) {
          return ErrorResponse.NotFound(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    );
};
