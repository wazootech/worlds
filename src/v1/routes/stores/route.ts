import { accepts } from "@std/http/negotiation";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type {
  DecodableEncoding,
  EncodableEncoding,
} from "#/oxigraph/oxigraph-encoding.ts";
import {
  decodableEncodings,
  decodeStore,
  encodableEncodings,
  encodeStore,
} from "#/oxigraph/oxigraph-encoding.ts";
import type { OxigraphServiceEnv } from "#/oxigraph/oxigraph-middleware.ts";
import {
  v1RdfContentSchema,
  v1StoreParamsSchema,
  v1StoreSchema,
} from "#/v1/schemas/stores.ts";

// Establish the app's environment.

export const app = new OpenAPIHono<OxigraphServiceEnv>();

// Define routes.

export const v1GetStoreRoute = createRoute({
  method: "get",
  path: "/v1/stores/{store}",
  operationId: "getStore",
  request: {
    params: v1StoreParamsSchema,
  },
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: "Get a store",
      content: {
        "application/json": { schema: v1StoreSchema },
        ...Object.fromEntries(
          Object.values(encodableEncodings).map((encoding) => [
            encoding,
            { schema: v1RdfContentSchema },
          ]),
        ),
      },
    },
    404: { description: "Store not found" },
    406: { description: "Not Acceptable" },
  },
});

export const v1PutStoreRoute = createRoute({
  method: "put",
  path: "/v1/stores/{store}",
  operationId: "setStore",
  description: "Overwrite the store's contents",
  security: [{ Bearer: [] }],
  request: {
    params: v1StoreParamsSchema,
    body: {
      description: "RDF Data",
      content: {
        "application/n-quads": { schema: v1RdfContentSchema },
        "text/turtle": { schema: v1RdfContentSchema },
        "application/ld+json": { schema: v1RdfContentSchema },
        "application/trig": { schema: v1RdfContentSchema },
      },
    },
  },
  responses: {
    204: { description: "Store updated successfully" },
    400: { description: "Invalid RDF data" },
    412: { description: "Precondition Failed" },
  },
});

export const v1PostStoreRoute = createRoute({
  method: "post",
  path: "/v1/stores/{store}",
  operationId: "addQuads",
  description: "Add quads to the store",
  security: [{ Bearer: [] }],
  request: {
    params: v1StoreParamsSchema,
    body: {
      description: "RDF Data",
      content: {
        "application/n-quads": { schema: v1RdfContentSchema },
        "text/turtle": { schema: v1RdfContentSchema },
        "application/ld+json": { schema: v1RdfContentSchema },
        "application/trig": { schema: v1RdfContentSchema },
      },
    },
  },
  responses: {
    204: { description: "Store updated successfully" },
    400: { description: "Invalid RDF data" },
  },
});

export const v1DeleteStoreRoute = createRoute({
  method: "delete",
  path: "/v1/stores/{store}",
  operationId: "removeStore",
  description: "Delete the store",
  security: [{ Bearer: [] }],
  request: {
    params: v1StoreParamsSchema,
  },
  responses: {
    204: { description: "Store deleted" },
  },
});

// Implement routes.

app.openapi(v1GetStoreRoute, async (ctx) => {
  const storeId = ctx.req.param("store");
  const store = await ctx.var.oxigraphService.getStore(storeId);
  if (!store) {
    return ctx.notFound();
  }

  const supported = ["application/json", ...Object.values(encodableEncodings)];
  const encoding = accepts(ctx.req.raw, ...supported) ?? "application/json";
  if (encoding === "application/json") {
    return ctx.json({ id: storeId });
  }

  if (!(Object.values(encodableEncodings) as string[]).includes(encoding)) {
    return ctx.json({ id: storeId });
  }

  try {
    const data = encodeStore(store, encoding as EncodableEncoding);
    return ctx.body(data, {
      headers: { "Content-Type": encoding },
    });
  } catch (_e) {
    return ctx.json({ error: "Encoding failed" }, 500);
  }
});

app.openapi(v1PutStoreRoute, async (ctx) => {
  const storeId = ctx.req.param("store");
  const contentType = ctx.req.header("Content-Type");

  if (!contentType) {
    return ctx.json({ error: "Content-Type required" }, 400);
  }

  if (!(Object.values(decodableEncodings) as string[]).includes(contentType)) {
    return ctx.json({ error: "Unsupported Content-Type" }, 400);
  }

  /*
   * We use ctx.req.text() directly to buffer the body.
   * This ensures consistent behavior across different content types and middleware interactions.
   */
  const bodyText = await ctx.req.text();

  if (!bodyText) {
    return ctx.json({ error: "Body is empty or null" }, 400);
  }

  try {
    const stream = new Blob([bodyText]).stream();
    const store = await decodeStore(
      stream,
      contentType as DecodableEncoding,
    );

    await ctx.var.oxigraphService.setStore(storeId, store);
    return ctx.body(null, 204);
  } catch (_err) {
    return ctx.json({ error: "Invalid RDF Syntax" }, 400);
  }
});

app.openapi(v1PostStoreRoute, async (ctx) => {
  const storeId = ctx.req.param("store");
  const contentType = ctx.req.header("Content-Type");

  if (!contentType) {
    return ctx.json({ error: "Content-Type required" }, 400);
  }

  if (!(Object.values(decodableEncodings) as string[]).includes(contentType)) {
    return ctx.json({ error: "Unsupported Content-Type" }, 400);
  }

  /*
   * We use ctx.req.text() directly.
   */
  const bodyText = await ctx.req.text();

  if (!bodyText) {
    return ctx.json({ error: "Body is empty or null" }, 400);
  }

  try {
    const stream = new Blob([bodyText]).stream();
    const store = await decodeStore(
      stream,
      contentType as DecodableEncoding,
    );

    await ctx.var.oxigraphService.addQuads(storeId, store.match());
    return ctx.body(null, 204);
  } catch (_err) {
    return ctx.json({ error: "Invalid RDF Syntax" }, 400);
  }
});

app.openapi(v1DeleteStoreRoute, async (ctx) => {
  const storeId = ctx.req.param("store");
  await ctx.var.oxigraphService.removeStore(storeId);
  return ctx.body(null, 204);
});
