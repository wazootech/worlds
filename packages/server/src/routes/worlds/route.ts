import { STATUS_CODE } from "@std/http/status";
import { Router } from "@fartlabs/rt";
import type {
  WorldsContentType,
  WorldsContext,
  WorldSource,
} from "@wazoo/worlds-sdk";
import {
  DEFAULT_NAMESPACE,
  expandPathNamespace,
  expandPathSlug,
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

function pathGroup(
  params: URLPatternResult | undefined,
  name: string,
): string | undefined {
  const g = params?.pathname.groups as
    | Record<string, string | undefined>
    | undefined;
  return g?.[name];
}

/**
 * worldsRouter creates a router for the Worlds API.
 */
export default (appContext: WorldsContext) => {
  return new Router()
    .post(
      "/namespaces/:namespace/worlds/:slug/export",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        const pathSlug = pathGroup(ctx.params, "slug");
        if (!pathNs || !pathSlug) {
          return ErrorResponse.BadRequest("Namespace and world slug required");
        }
        return await handleExport(
          appContext,
          ctx,
          pathNs,
          pathSlug,
        );
      },
    )
    .post(
      "/namespaces/:namespace/worlds/:slug/import",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        const pathSlug = pathGroup(ctx.params, "slug");
        if (!pathNs || !pathSlug) {
          return ErrorResponse.BadRequest("Namespace and world slug required");
        }
        return await handleImport(
          appContext,
          ctx,
          pathNs,
          pathSlug,
        );
      },
    )
    .post(
      "/worlds/:slug/export",
      async (ctx) => {
        const pathSlug = pathGroup(ctx.params, "slug");
        if (!pathSlug) {
          return ErrorResponse.BadRequest("World slug required");
        }
        return await handleExport(
          appContext,
          ctx,
          DEFAULT_NAMESPACE,
          pathSlug,
        );
      },
    )
    .post(
      "/worlds/:slug/import",
      async (ctx) => {
        const pathSlug = pathGroup(ctx.params, "slug");
        if (!pathSlug) {
          return ErrorResponse.BadRequest("World slug required");
        }
        return await handleImport(
          appContext,
          ctx,
          DEFAULT_NAMESPACE,
          pathSlug,
        );
      },
    )
    .get(
      "/namespaces/:namespace/worlds/:slug",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        const pathSlug = pathGroup(ctx.params, "slug");
        if (!pathNs || pathSlug === undefined) {
          return ErrorResponse.BadRequest("Namespace and world slug required");
        }
        return await handleGetWorld(appContext, ctx, pathNs, pathSlug);
      },
    )
    .put(
      "/namespaces/:namespace/worlds/:slug",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        const pathSlug = pathGroup(ctx.params, "slug");
        if (!pathNs || pathSlug === undefined) {
          return ErrorResponse.BadRequest("Namespace and world slug required");
        }
        return await handlePutWorld(appContext, ctx, pathNs, pathSlug);
      },
    )
    .delete(
      "/namespaces/:namespace/worlds/:slug",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        const pathSlug = pathGroup(ctx.params, "slug");
        if (!pathNs || pathSlug === undefined) {
          return ErrorResponse.BadRequest("Namespace and world slug required");
        }
        return await handleDeleteWorld(appContext, ctx, pathNs, pathSlug);
      },
    )
    .get(
      "/worlds/:slug",
      async (ctx) => {
        const pathSlug = pathGroup(ctx.params, "slug");
        if (pathSlug === undefined) {
          return ErrorResponse.BadRequest("World slug required");
        }
        return await handleGetWorld(
          appContext,
          ctx,
          DEFAULT_NAMESPACE,
          pathSlug,
        );
      },
    )
    .put(
      "/worlds/:slug",
      async (ctx) => {
        const pathSlug = pathGroup(ctx.params, "slug");
        if (pathSlug === undefined) {
          return ErrorResponse.BadRequest("World slug required");
        }
        return await handlePutWorld(
          appContext,
          ctx,
          DEFAULT_NAMESPACE,
          pathSlug,
        );
      },
    )
    .delete(
      "/worlds/:slug",
      async (ctx) => {
        const pathSlug = pathGroup(ctx.params, "slug");
        if (pathSlug === undefined) {
          return ErrorResponse.BadRequest("World slug required");
        }
        return await handleDeleteWorld(
          appContext,
          ctx,
          DEFAULT_NAMESPACE,
          pathSlug,
        );
      },
    )
    .get(
      "/namespaces/:namespace/worlds",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        if (!pathNs) {
          return ErrorResponse.BadRequest("Namespace required");
        }
        return await handleListWorlds(appContext, ctx, pathNs);
      },
    )
    .post(
      "/namespaces/:namespace/worlds",
      async (ctx) => {
        const pathNs = pathGroup(ctx.params, "namespace");
        if (!pathNs) {
          return ErrorResponse.BadRequest("Namespace required");
        }
        return await handleCreateWorld(appContext, ctx, pathNs);
      },
    )
    .get(
      "/worlds",
      async (ctx) => {
        return await handleListWorlds(appContext, ctx, DEFAULT_NAMESPACE);
      },
    )
    .post(
      "/worlds",
      async (ctx) => {
        return await handleCreateWorld(appContext, ctx, DEFAULT_NAMESPACE);
      },
    );
};

async function handleExport(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
  pathNamespaceRaw: string,
  pathSlugRaw: string,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const effectiveNs = expandPathNamespace(
    decodeURIComponent(pathNamespaceRaw),
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const body = await ctx.request.json().catch(() => ({}));
  const slug = expandPathSlug(decodeURIComponent(pathSlugRaw));
  const pathSource: WorldSource = { namespace: effectiveNs, slug };
  const { contentType: contentTypeParam } = body as {
    contentType?: string;
    source?: WorldSource;
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
      source: body.source ?? pathSource,
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

async function handleImport(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
  pathNamespaceRaw: string,
  pathSlugRaw: string,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const effectiveNs = expandPathNamespace(
    decodeURIComponent(pathNamespaceRaw),
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const body = await ctx.request.json();
  const { data, contentType = "application/n-quads" } = body as {
    data?: string;
    contentType?: string;
  };
  if (!data) {
    return ErrorResponse.BadRequest("Import data required");
  }

  const slug = expandPathSlug(decodeURIComponent(pathSlugRaw));
  const pathSource: WorldSource = { namespace: effectiveNs, slug };
  const binaryData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
    .buffer;

  try {
    const engine = getNamespacedEngine(appContext, effectiveNs);
    const bodyTyped = body as { source?: WorldSource };
    await engine.import({
      source: bodyTyped.source ?? pathSource,
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

async function handleGetWorld(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
  pathNamespaceRaw: string,
  pathSlugRaw: string,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const effectiveNs = expandPathNamespace(
    decodeURIComponent(pathNamespaceRaw),
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const slug = expandPathSlug(decodeURIComponent(pathSlugRaw));
  const engine = getNamespacedEngine(appContext, effectiveNs);
  const world = await engine.get({
    source: { namespace: effectiveNs, slug },
  });
  if (!world) {
    return ErrorResponse.NotFound("World not found");
  }

  return await handleETagRequest(ctx.request, Response.json(world));
}

async function handlePutWorld(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
  pathNamespaceRaw: string,
  pathSlugRaw: string,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const effectiveNs = expandPathNamespace(
    decodeURIComponent(pathNamespaceRaw),
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await ctx.request.json();
  } catch {
    return ErrorResponse.BadRequest("Invalid JSON");
  }

  const slug = expandPathSlug(decodeURIComponent(pathSlugRaw));
  const updateResult = worldsUpdateInputSchema.safeParse({
    ...(body as object),
    source: (body as { source?: unknown; slug?: string }).source ??
      { namespace: effectiveNs, slug },
  });
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

async function handleDeleteWorld(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
  pathNamespaceRaw: string,
  pathSlugRaw: string,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const effectiveNs = expandPathNamespace(
    decodeURIComponent(pathNamespaceRaw),
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const slug = expandPathSlug(decodeURIComponent(pathSlugRaw));
  const pathSource: WorldSource = { namespace: effectiveNs, slug };

  try {
    const body = await ctx.request.json().catch(() => ({}));
    const engine = getNamespacedEngine(appContext, effectiveNs);
    const bodyTyped = body as { source?: WorldSource };
    await engine.delete({
      source: bodyTyped.source ?? pathSource,
    });
    return new Response(null, { status: STATUS_CODE.NoContent });
  } catch (error) {
    return ErrorResponse.NotFound(
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function handleListWorlds(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
  pathNamespaceRaw: string,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const effectiveNs = expandPathNamespace(
    decodeURIComponent(pathNamespaceRaw),
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

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
  const engine = getNamespacedEngine(appContext, effectiveNs);
  const results = await engine.list({
    page,
    pageSize,
    namespace: effectiveNs,
  });

  return await handleETagRequest(ctx.request, Response.json(results));
}

async function handleCreateWorld(
  appContext: WorldsContext,
  ctx: { request: Request; params?: URLPatternResult },
  pathNamespaceRaw: string,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Forbidden("Forbidden");
  }

  const effectiveNs = expandPathNamespace(
    decodeURIComponent(pathNamespaceRaw),
    authorized.namespaceId,
  );
  const denied = assertNamespacePathAllowed(authorized, effectiveNs);
  if (denied) return denied;

  const body = await ctx.request.json();
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
