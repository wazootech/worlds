import { Hono } from "@hono/hono";
import type { Context } from "@hono/hono";
import { decodeBase64 } from "@std/encoding/base64";
import type { WorldsInterface } from "@wazoo/worlds-sdk";
import {
  zCreateWorldRequest,
  zDeleteWorldRequest,
  zExportWorldRequest,
  zGetWorldRequest,
  zImportWorldRequest,
  zListWorldsRequest,
  zSearchWorldsRequest,
  zSparqlQueryRequest,
  zUpdateWorldRequest,
} from "@wazoo/worlds-spec/zod";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "#/utils/errors/errors.ts";

/**
 * rpcRouter creates a router for the Unified RPC API.
 */
export default (worlds: WorldsInterface) => {
  const app = new Hono();

  app.post("/rpc", async (c) => {
    try {
      return await handleRpc(worlds, c);
    } catch (error: unknown) {
      // Handle standardized HTTP errors (any object with a numeric status property)
      if (
        error && typeof error === "object" && "status" in error &&
        typeof (error as { status: unknown }).status === "number"
      ) {
        const httpError = error as { status: number; message?: string };
        return c.json(
          {
            error: {
              code: httpError.status,
              message: httpError.message || "An error occurred",
            },
          },
          httpError.status as any,
        );
      }

      if (error instanceof Error) {
        console.error(`[RPC Middleware Error]:`, error.stack);
      } else {
        console.error(`[RPC Middleware Error]:`, error);
      }

      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      return c.json(
        { error: { code: 500, message, stack } },
        500,
      );
    }
  });

  return app;
};

/**
 * handleRpc is the unified entry point for all Worlds RPC actions.
 */
export async function handleRpc(
  worlds: WorldsInterface,
  c: Context,
): Promise<Response> {
  const body = await c.req.json().catch(() => ({}));
  const { action, ...params } = body;

  if (!action) {
    throw new BadRequestError("RPC action required in body");
  }

  console.log(
    `[RPC Dispatcher] action=${action}, keys=${Object.keys(params).join(",")}`,
  );

  switch (action) {
    case "list": {
      const parseResult = zListWorldsRequest.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const result = await worlds.listWorlds(parseResult.data);
      return c.json(result);
    }

    case "create": {
      const parseResult = zCreateWorldRequest.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const world = await worlds.createWorld(parseResult.data);
      return c.json(world, 201);
    }

    case "get": {
      const parseResult = zGetWorldRequest.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const world = await worlds.getWorld(parseResult.data);
      if (!world) {
        throw new NotFoundError("World not found");
      }
      return c.json(world);
    }

    case "update": {
      const parseResult = zUpdateWorldRequest.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const world = await worlds.updateWorld(parseResult.data);
      return c.json(world);
    }

    case "delete": {
      const parseResult = zDeleteWorldRequest.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      await worlds.deleteWorld(parseResult.data);
      return c.body(null, { status: 204 });
    }

    case "export": {
      const parseResult = zExportWorldRequest.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const data = await worlds.export(parseResult.data);
      return c.body(data, 200, {
        "Content-Type": parseResult.data.contentType || "application/n-quads",
      });
    }

    case "import": {
      const parseResult = zImportWorldRequest.safeParse(params);
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
          (parseResult.data as unknown as Record<string, unknown>).data =
            decodeBase64(
              parseResult.data.data,
            );
        } catch {
          // Keep as string if not valid base64
        }
      }
      await worlds.import(parseResult.data);
      return c.body(null, { status: 204 });
    }

    case "sparql": {
      const parseResult = zSparqlQueryRequest.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const result = await worlds.sparql(parseResult.data);
      return c.json(result);
    }

    case "search": {
      const parseResult = zSearchWorldsRequest.safeParse(params);
      if (!parseResult.success) {
        throw new BadRequestError(
          `Invalid parameters: ${parseResult.error.message}`,
        );
      }
      const results = await worlds.search(parseResult.data);
      return c.json(results);
    }

    default: {
      throw new BadRequestError(`Unknown RPC action: ${action}`);
    }
  }
}
