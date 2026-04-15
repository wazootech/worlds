import { STATUS_CODE } from "@std/http/status";
import { Router } from "@fartlabs/rt";
import type {
  WorldsContentType,
  WorldsContext,
  WorldSource,
} from "@wazoo/worlds-sdk";
import {
  expandPathNamespace,
  resolveSource,
  worldsCreateInputSchema,
  worldsListInputSchema,
  worldsUpdateInputSchema,
} from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
import { handleETagRequest } from "#/utils/http/etag.ts";
import { negotiateSerialization } from "#/utils/http/negotiation.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";
import { handleSparql } from "./sparql/route.ts";
import { handleSearch } from "./search/route.ts";

/**
 * worldsRouter creates a router for the Worlds API.
 */
export default (appContext: WorldsContext) => {
  return new Router()
    .post("/worlds/rpc/export", async (ctx) => {
      return await handleExport(appContext, ctx);
    })
    .post("/worlds/rpc/import", async (ctx) => {
      return await handleImport(appContext, ctx);
    })
    .post("/worlds/rpc/get", async (ctx) => {
      return await handleGetWorld(appContext, ctx);
    })
    .post("/worlds/rpc/update", async (ctx) => {
      return await handlePutWorld(appContext, ctx);
    })
    .post("/worlds/rpc/delete", async (ctx) => {
      return await handleDeleteWorld(appContext, ctx);
    })
    .post("/worlds/rpc/sparql", async (ctx) => {
      return await handleSparql(appContext, ctx);
    })
    .post("/worlds/rpc/search", async (ctx) => {
      return await handleSearch(appContext, ctx);
    })
    .get(
      "/worlds",
      async (ctx) => {
        return await handleListWorlds(appContext, ctx);
      },
    )
    .post(
      "/worlds",
      async (ctx) => {
        return await handleCreateWorld(appContext, ctx);
      },
    );
};

export async function handleExport(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const body = await ctx.request.json().catch(() => ({}));
  const sourceRaw: WorldSource | undefined = body.source;
  if (!sourceRaw) {
    return ErrorResponse.BadRequest("Resource source required in body");
  }

  const source = resolveSource(sourceRaw, authorized.namespaceId);
  const effectiveNs = expandPathNamespace(
    source.namespace ?? null,
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const { contentType: contentTypeParam } = body as {
    contentType?: string;
  };

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
    const engine = getNamespacedEngine(appContext, effectiveNs);
    const buffer = await engine.export({
      source,
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
}

export async function handleImport(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const body = await ctx.request.json();
  const { source: sourceRaw, data, contentType = "application/n-quads" } =
    body as {
      source?: WorldSource;
      data?: string;
      contentType?: string;
    };
  if (!sourceRaw) {
    return ErrorResponse.BadRequest("Resource source required in body");
  }
  if (!data) {
    return ErrorResponse.BadRequest("Import data required");
  }

  const source = resolveSource(sourceRaw, authorized.namespaceId);
  const effectiveNs = expandPathNamespace(
    source.namespace ?? null,
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const binaryData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
    .buffer;

  try {
    const engine = getNamespacedEngine(appContext, effectiveNs);
    await engine.import({
      source,
      data: binaryData as ArrayBuffer,
      contentType: contentType as WorldsContentType,
    });
    return new Response(null, { status: STATUS_CODE.NoContent });
  } catch (error) {
    return ErrorResponse.BadRequest(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function handleGetWorld(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const body = await ctx.request.json().catch(() => ({}));
  const sourceRaw: WorldSource | undefined = body.source;
  if (!sourceRaw) {
    return ErrorResponse.BadRequest("Resource source required in body");
  }

  const source = resolveSource(sourceRaw, authorized.namespaceId);
  const effectiveNs = expandPathNamespace(
    source.namespace ?? null,
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const engine = getNamespacedEngine(appContext, effectiveNs);
  const world = await engine.get({ source });
  if (!world) {
    return ErrorResponse.NotFound("World not found");
  }

  return await handleETagRequest(ctx.request, Response.json(world));
}

export async function handlePutWorld(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  let body: unknown;
  try {
    body = await ctx.request.json();
  } catch {
    return ErrorResponse.BadRequest("Invalid JSON");
  }

  const sourceRaw = (body as { source?: WorldSource }).source;
  if (!sourceRaw) {
    return ErrorResponse.BadRequest("Resource source required in body");
  }

  const source = resolveSource(sourceRaw, authorized.namespaceId);
  const effectiveNs = expandPathNamespace(
    source.namespace ?? null,
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const updateResult = worldsUpdateInputSchema.safeParse(body);
  if (!updateResult.success) {
    return ErrorResponse.BadRequest("Invalid parameters");
  }

  try {
    const engine = getNamespacedEngine(appContext, effectiveNs);
    await engine.update(updateResult.data);
    return new Response(null, { status: STATUS_CODE.NoContent });
  } catch (error) {
    return ErrorResponse.NotFound(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function handleDeleteWorld(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const body = await ctx.request.json().catch(() => ({}));
  const sourceRaw: WorldSource | undefined = body.source;
  if (!sourceRaw) {
    return ErrorResponse.BadRequest("Resource source required in body");
  }

  const source = resolveSource(sourceRaw, authorized.namespaceId);
  const effectiveNs = expandPathNamespace(
    source.namespace ?? null,
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  try {
    const engine = getNamespacedEngine(appContext, effectiveNs);
    await engine.delete({ source });
    return new Response(null, { status: STATUS_CODE.NoContent });
  } catch (error) {
    return ErrorResponse.NotFound(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function handleListWorlds(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const url = new URL(ctx.request.url);
  const pageString = url.searchParams.get("page") ?? "1";
  const pageSizeString = url.searchParams.get("pageSize") ?? "20";
  const namespace = url.searchParams.get("namespace") ?? authorized.namespaceId;

  const effectiveNs = expandPathNamespace(
    namespace ?? null,
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const paginationResult = worldsListInputSchema.safeParse({
    page: parseInt(pageString),
    pageSize: parseInt(pageSizeString),
  });

  if (!paginationResult.success) {
    return ErrorResponse.BadRequest("Invalid pagination parameters");
  }

  const { page, pageSize } = paginationResult.data;
  const engine = getNamespacedEngine(appContext, effectiveNs);
  const results = await engine.list({
    page,
    pageSize,
    namespace: effectiveNs,
  });

  return await handleETagRequest(ctx.request, Response.json(results));
}

export async function handleCreateWorld(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Forbidden("Forbidden");
  }

  const body = await ctx.request.json().catch(() => ({}));
  const namespace = (body as { namespace?: string }).namespace ??
    authorized.namespaceId;

  const effectiveNs = expandPathNamespace(
    namespace ?? null,
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const parseResult = worldsCreateInputSchema.safeParse(body);
  if (!parseResult.success) {
    return ErrorResponse.BadRequest("Invalid parameters");
  }

  try {
    const engine = getNamespacedEngine(appContext, effectiveNs);
    const world = await engine.create({
      ...parseResult.data,
      namespace: effectiveNs,
    });
    return Response.json(world, { status: STATUS_CODE.Created });
  } catch (error) {
    return ErrorResponse.Conflict(
      error instanceof Error ? error.message : String(error),
    );
  }
}
