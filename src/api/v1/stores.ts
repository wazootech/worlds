import type { MiddlewareHandler } from "hono";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { OxigraphService } from "#/oxigraph/oxigraph-service.ts";
import type {
  DecodableEncoding,
  EncodableEncoding,
} from "#/oxigraph/oxigraph-encoding.ts";
import { decodeStore, encodeStore } from "#/oxigraph/oxigraph-encoding.ts";

// Establish the app's environment.
export interface OxigraphServiceEnv {
  Variables: {
    oxigraphService: OxigraphService;
  };
}

export function withOxigraphService(
  oxigraphService: OxigraphService,
): MiddlewareHandler<OxigraphServiceEnv> {
  return (ctx, next) => {
    ctx.set("oxigraphService", oxigraphService);
    return next();
  };
}

export const app = new OpenAPIHono<OxigraphServiceEnv>();

// Define the schemas for GET /stores/{store}.
export const storeSchema = z.object({
  id: z.string(),
}).openapi("Store");

export const getStoreParamsSchema = z.object({
  store: z.string(),
}).openapi("GetStoreParams");

// Define the route for GET /stores/{store}.
export const getStoreRoute = createRoute({
  method: "get",
  path: "/stores/{store}",
  request: {
    params: getStoreParamsSchema,
  },
  responses: {
    200: {
      description: "Get a store",
      content: {
        "application/json": {
          schema: storeSchema,
        },
        "application/ld+json": {
          schema: z.string(),
        },
        "application/n-quads": {
          schema: z.string(),
        },
        "application/trig": {
          schema: z.string(),
        },
        "text/turtle": {
          schema: z.string(),
        },
        "application/n-triples": {
          schema: z.string(),
        },
        "text/n3": {
          schema: z.string(),
        },
        "application/rdf+xml": {
          schema: z.string(),
        },
      },
    },
    404: {
      description: "Store not found",
    },
  },
});

app.openapi(
  getStoreRoute,
  async (ctx) => {
    const storeId = ctx.req.param("store");
    const store = await ctx.var.oxigraphService.getStore(storeId);
    if (!store) {
      return ctx.notFound();
    }

    const encoding = ctx.req.header("Accept") ?? "application/json";
    if (encoding === "application/json") {
      return ctx.json({ id: storeId });
    }

    const data = await encodeStore(store, encoding as EncodableEncoding);
    return ctx.body(data as Uint8Array<ArrayBuffer>, {
      headers: { "Content-Type": encoding },
    });
  },
);

// Define the schemas for POST /store/{store}.
export const postStoreParamsSchema = z.object({
  store: z.string(),
}).openapi("PostStoreParams");

// Define the route for POST /store/{store}.
export const postStoreRoute = createRoute({
  method: "post",
  path: "/stores/{store}",
  description: "Set the store's contents",
  request: {
    params: getStoreParamsSchema,
    body: {
      content: {
        "application/ld+json": {
          schema: z.string(),
        },
        "application/n-quads": {
          schema: z.string(),
        },
        "application/trig": {
          schema: z.string(),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Post a store",
      content: {
        "application/json": {
          schema: storeSchema,
        },
      },
    },
    404: {
      description: "Store not found",
    },
  },
});

app.openapi(postStoreRoute, async (ctx) => {
  const encoding = ctx.req.header("Content-Type") ?? "application/json";
  const store = await decodeStore(
    await ctx.req.raw.bytes(),
    encoding as DecodableEncoding,
  );

  const storeId = ctx.req.param("store");
  await ctx.var.oxigraphService.setStore(storeId, store);
  return ctx.json({ id: storeId }, 201);
});

// Define the schemas for DELETE /store/{store}.
export const deleteStoreParamsSchema = z.object({
  store: z.string(),
}).openapi("DeleteStoreParams");

// Define the route for DELETE /store/{store}.
export const deleteStoreRoute = createRoute({
  method: "delete",
  path: "/stores/{store}",
  description: "Delete the store",
  request: {
    params: deleteStoreParamsSchema,
  },
  responses: {
    204: {
      description: "Delete a store",
    },
    404: {
      description: "Store not found",
    },
  },
});

app.openapi(deleteStoreRoute, async (ctx) => {
  const storeId = ctx.req.param("store");
  await ctx.var.oxigraphService.removeStore(storeId);
  return ctx.body(null, 204);
});
