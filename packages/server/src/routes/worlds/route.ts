import { STATUS_CODE } from "@std/http/status";
import { Router } from "@fartlabs/rt";
import {
  ErrorResponse,
  handleETagRequest,
  negotiateSerialization,
  worldsCreateInputSchema,
  worldsListInputSchema,
  worldsUpdateInputSchema,
} from "@wazoo/worlds-sdk";
import type { WorldsContentType, WorldsContext } from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";

/**
 * worldsRouter creates a router for the Worlds API.
 */
export default (appContext: WorldsContext) => {
  const engine = appContext.engine;
  if (!engine) {
    throw new Error("Engine not initialized in context");
  }

  return new Router()
    .get(
      "/worlds/:world",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const world = await engine.get({ world: worldId });
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

        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const url = new URL(ctx.request.url);
        const contentTypeParam = url.searchParams.get("contentType") as
          | WorldsContentType
          | null;

        let serialization;
        if (contentTypeParam) {
          serialization = {
            contentType: contentTypeParam,
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
          const buffer = await engine.export({
            world: worldId,
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
      "/worlds/:world/import",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const body = await ctx.request.arrayBuffer();
        const contentType =
          ctx.request.headers.get("Content-Type") as WorldsContentType ||
          "application/n-quads";

        try {
          await engine.import({ world: worldId, data: body, contentType });
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
        if (!authorized.admin) {
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
        const results = await engine.list({ page, pageSize });

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
        if (!authorized.admin) {
          return ErrorResponse.Forbidden("Only admins can create worlds");
        }

        const body = await ctx.request.json();
        const parseResult = worldsCreateInputSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest("Invalid parameters");
        }

        try {
          const world = await engine.create(parseResult.data);
          return Response.json(world, { status: STATUS_CODE.Created });
        } catch (error) {
          return ErrorResponse.Conflict(
            error instanceof Error ? error.message : String(error),
          );
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

        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin) {
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
          world: worldId,
        });
        if (!updateResult.success) {
          return ErrorResponse.BadRequest("Invalid parameters");
        }

        try {
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
      "/worlds/:world",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = await authorizeRequest(
          appContext,
          ctx.request,
        );
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        try {
          await engine.delete({ world: worldId });
          return new Response(null, { status: STATUS_CODE.NoContent });
        } catch (error) {
          return ErrorResponse.NotFound(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    );
};
