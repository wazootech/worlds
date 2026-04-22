import { Router } from "@fartlabs/rt";
import { decodeBase64 } from "@std/encoding/base64";
import type { WorldsRegistry } from "@wazoo/worlds-sdk";
import {
  worldsCreateInputSchema,
  worldsDeleteInputSchema,
  worldsExportInputSchema,
  worldsGetInputSchema,
  worldsImportInputSchema,
  worldsListInputSchema,
  worldsSearchInputSchema,
  worldsSparqlInputSchema,
  worldsUpdateInputSchema,
} from "#/utils/validation/worlds.validation.ts";
import { authorizeRequest } from "#/middleware/auth.ts";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "#/utils/errors/errors.ts";

/**
 * rpcRouter creates a router for the Unified RPC API.
 */
export default (registry: WorldsRegistry) => {
  return new Router()
    .post("/rpc", async (ctx) => {
      try {
        return await handleRpc(registry, ctx);
      } catch (error: unknown) {
        // Handle standardized HTTP errors (any object with a numeric status property)
        if (
          error && typeof error === "object" && "status" in error &&
          typeof (error as { status: unknown }).status === "number"
        ) {
          const httpError = error as { status: number; message?: string };
          return Response.json(
            {
              error: {
                code: httpError.status,
                message: httpError.message || "An error occurred",
              },
            },
            { status: httpError.status },
          );
        }

        if (error instanceof Error) {
          console.error(`[RPC Middleware Error]:`, error.stack);
        } else {
          console.error(`[RPC Middleware Error]:`, error);
        }

        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        return Response.json(
          { error: { code: 500, message, stack } },
          { status: 500 },
        );
      }
    });
};

/**
 * handleRpc is the unified entry point for all Worlds RPC actions.
 */
export async function handleRpc(
  registry: WorldsRegistry,
  ctx: { request: Request; params?: URLPatternResult },
): Promise<Response> {
  const body = await ctx.request.json().catch(() => ({}));
  const { action, ...params } = body;

  if (!action) {
    throw new BadRequestError("RPC action required in body");
  }

  const engine = registry.activeEngine;
  if (!engine) {
    throw new InternalServerError("Engine not initialized");
  }

  const authorized = await authorizeRequest(registry, ctx.request);
  if (!authorized.admin && !authorized.namespaceId) {
    throw new UnauthorizedError(
      `Admin/Namespace access required for ${action}`,
    );
  }

  console.log(
    `[RPC Dispatcher] action=${action}, keys=${Object.keys(params).join(",")}`,
  );

  switch (action) {
    case "list": {
      const parseResult = worldsListInputSchema.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const worlds = await engine.list(parseResult.data);
      return Response.json(worlds);
    }
    case "create": {
      const parseResult = worldsCreateInputSchema.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const world = await engine.create(parseResult.data);
      return Response.json(world, { status: 201 });
    }
    case "get": {
      const parseResult = worldsGetInputSchema.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const world = await engine.get(parseResult.data);
      if (!world) {
        throw new NotFoundError("World not found");
      }
      return Response.json(world);
    }
    case "update": {
      const parseResult = worldsUpdateInputSchema.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const world = await engine.update(parseResult.data);
      return Response.json(world);
    }
    case "delete": {
      const parseResult = worldsDeleteInputSchema.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      await engine.delete(parseResult.data);
      return new Response(null, { status: 204 });
    }
    case "export": {
      const parseResult = worldsExportInputSchema.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const data = await engine.export(parseResult.data);
      return new Response(data, {
        headers: {
          "Content-Type": parseResult.data.contentType || "application/n-quads",
        },
      });
    }
    case "import": {
      const parseResult = worldsImportInputSchema.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      // Handle Base64 encoded transfer from SDK
      // We only decode if it's a string without whitespace (common for base64)
      if (
        typeof parseResult.data.data === "string" &&
        !/[\s\n\r\t]/.test(parseResult.data.data)
      ) {
        try {
          parseResult.data.data = decodeBase64(
            parseResult.data.data,
          ) as unknown as ArrayBuffer;
        } catch {
          // Keep as string if not valid base64
        }
      }
      await engine.import(parseResult.data);
      return new Response(null, { status: 204 });
    }
    case "sparql": {
      const parseResult = worldsSparqlInputSchema.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const result = await engine.sparql(parseResult.data);
      return Response.json(result);
    }
    case "search": {
      const parseResult = worldsSearchInputSchema.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const results = await engine.search(parseResult.data);
      return Response.json(results);
    }
    default:
      throw new BadRequestError(`Unknown RPC action: ${action}`);
  }
}
