import { accepts } from "@std/http/negotiation";
import type { MiddlewareHandler } from "hono";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { OxigraphService } from "#/oxigraph/oxigraph-service.ts";
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

// Define shared schemas.

export const v1StoreParamsSchema = z.object({
  store: z.string().min(1).openapi({
    param: { name: "store", in: "path" },
    example: "my-graph-db",
  }),
});

const rdfContentSchema = z.string().openapi({ format: "binary" });

export const v1StoreSchema = z.object({
  id: z.string(),
}).openapi("V1Store");

// Define routes.

export const v1GetStoreRoute = createRoute({
  method: "get",
  path: "/v1/stores/{store}",
  request: {
    params: v1StoreParamsSchema,
  },
  responses: {
    200: {
      description: "Get a store",
      content: {
        "application/json": { schema: v1StoreSchema },
        ...Object.fromEntries(
          Object.values(encodableEncodings).map((encoding) => [
            encoding,
            { schema: rdfContentSchema },
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
  description: "Overwrite the store's contents",
  request: {
    params: v1StoreParamsSchema,
    body: {
      description: "RDF Data",
      content: {
        "application/n-quads": { schema: rdfContentSchema },
        "text/turtle": { schema: rdfContentSchema },
        "application/ld+json": { schema: rdfContentSchema },
        "application/trig": { schema: rdfContentSchema },
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
  description: "Add quads to the store",
  request: {
    params: v1StoreParamsSchema,
    body: {
      description: "RDF Data",
      content: {
        "application/n-quads": { schema: rdfContentSchema },
        "text/turtle": { schema: rdfContentSchema },
        "application/ld+json": { schema: rdfContentSchema },
        "application/trig": { schema: rdfContentSchema },
      },
    },
  },
  responses: {
    204: { description: "Store updated successfully" },
    400: { description: "Invalid RDF data" },
  },
});

export const v1SparqlRoute = createRoute({
  method: "get",
  path: "/v1/stores/{store}/sparql",
  description: "Execute a SPARQL query (read-only)",
  request: {
    params: v1StoreParamsSchema,
    query: z.object({
      query: z.string().openapi({ description: "SPARQL query string" }),
      "default-graph-uri": z.union([z.string(), z.array(z.string())])
        .optional(),
      "named-graph-uri": z.union([z.string(), z.array(z.string())]).optional(),
    }),
  },
  responses: {
    200: {
      description: "Query results",
      content: {
        "application/sparql-results+json": { schema: z.object({}) },
        "application/sparql-results+xml": { schema: z.string() },
        "text/csv": { schema: z.string() },
        "application/n-quads": { schema: z.string() },
        "text/turtle": { schema: z.string() },
      },
    },
    400: { description: "Bad Request" },
  },
});

export const v1SparqlPostRoute = createRoute({
  method: "post",
  path: "/v1/stores/{store}/sparql",
  description: "Execute a SPARQL query or update",
  request: {
    params: v1StoreParamsSchema,
    body: {
      description: "SPARQL Query or Update",
      content: {
        "application/x-www-form-urlencoded": {
          schema: z.object({
            query: z.string().optional(),
            update: z.string().optional(),
            "default-graph-uri": z
              .union([z.string(), z.array(z.string())])
              .optional(),
            "named-graph-uri": z
              .union([z.string(), z.array(z.string())])
              .optional(),
          }),
        },
        "application/sparql-query": { schema: z.string() },
        "application/sparql-update": { schema: z.string() },
      },
    },
  },
  responses: {
    200: {
      description: "Query results or Update success",
      content: {
        "application/sparql-results+json": { schema: z.object({}) },
        "application/sparql-results+xml": { schema: z.string() },
        "text/csv": { schema: z.string() },
      },
    },
    204: { description: "Update successful (no content)" },
    400: { description: "Bad Request" },
  },
});

export const v1DeleteStoreRoute = createRoute({
  method: "delete",
  path: "/v1/stores/{store}",
  description: "Delete the store",
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

  try {
    const store = await decodeStore(
      ctx.req.raw.body!,
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

  try {
    const store = await decodeStore(
      ctx.req.raw.body!,
      contentType as DecodableEncoding,
    );

    await ctx.var.oxigraphService.addQuads(storeId, store.match());
    return ctx.body(null, 204);
  } catch (_err) {
    return ctx.json({ error: "Invalid RDF Syntax" }, 400);
  }
});

// Helper to serialize result to SPARQL Query Results JSON Format
function serializeSparqlJson(result: unknown): unknown {
  // Boolean result (ASK)
  if (typeof result === "boolean") {
    return { head: {}, boolean: result };
  }

  // SELECT result (Array of Maps)
  if (Array.isArray(result)) {
    const vars = new Set<string>();
    const bindings = result.map((binding: unknown) => {
      if (binding instanceof Map) {
        const obj: Record<string, unknown> = {};
        for (const [varName, term] of binding.entries()) {
          vars.add(varName);
          obj[varName] = serializeTerm(term);
        }
        return obj;
      }
      return {};
    });

    return {
      head: { vars: Array.from(vars) },
      results: { bindings },
    };
  }

  // CONSTRUCT describes (Array of Quads) - Not standard JSON result but usually handled as generic JSON-LD or similar.
  // For this endpoint, we might just return the array if it's not a map binding.
  // But strictly, application/sparql-results+json is for SELECT/ASK.
  // We'll leave it as is if it's not a boolean or Binding array (e.g. Quads).
  return result;
}

interface OxigraphTerm {
  termType: string;
  value: string;
  language?: string;
  datatype?: { value: string };
}

function serializeTerm(term: unknown): unknown {
  if (!term) return null;
  const t = term as OxigraphTerm;

  if (t.termType === "NamedNode") {
    return { type: "uri", value: t.value };
  } else if (t.termType === "BlankNode") {
    return { type: "bnode", value: t.value };
  } else if (t.termType === "Literal") {
    const result: Record<string, string> = { type: "literal", value: t.value };
    if (t.language) {
      result["xml:lang"] = t.language;
    } else if (
      t.datatype &&
      t.datatype.value !== "http://www.w3.org/2001/XMLSchema#string"
    ) {
      result.datatype = t.datatype.value;
    }
    return result;
  } else if (t.termType === "DefaultGraph") {
    return null;
  }
  // Fallback for unexpected objects
  return { type: "unknown", value: String(t.value) };
}

app.openapi(v1SparqlRoute, async (ctx) => {
  const storeId = ctx.req.param("store");
  const query = ctx.req.query("query");

  if (!query) {
    return ctx.json({ error: "Missing query parameter" }, 400);
  }

  try {
    const result = await ctx.var.oxigraphService.query(storeId, query);
    return ctx.json(serializeSparqlJson(result));
  } catch (err) {
    if (err instanceof Error && err.message === "Store not found") {
      return ctx.notFound();
    }
    return ctx.json({ error: "Invalid Query" }, 400);
  }
});

app.openapi(v1SparqlPostRoute, async (ctx) => {
  const storeId = ctx.req.param("store");
  const contentType = ctx.req.header("Content-Type");

  let query: string | undefined;
  let update: string | undefined;

  if (contentType === "application/sparql-query") {
    query = await ctx.req.text();
  } else if (contentType === "application/sparql-update") {
    update = await ctx.req.text();
  } else if (contentType === "application/x-www-form-urlencoded") {
    const body = await ctx.req.parseBody();
    if (typeof body.query === "string") query = body.query;
    if (typeof body.update === "string") update = body.update;
  } else {
    return ctx.json({ error: "Unsupported Content-Type" }, 400);
  }

  try {
    if (query) {
      const result = await ctx.var.oxigraphService.query(storeId, query);
      return ctx.json(serializeSparqlJson(result));
    } else if (update) {
      await ctx.var.oxigraphService.update(storeId, update);
      return ctx.body(null, 204);
    } else {
      return ctx.json({ error: "Missing query or update" }, 400);
    }
  } catch (err) {
    if (err instanceof Error && err.message === "Store not found") {
      return ctx.notFound();
    }
    return ctx.json({ error: "Execution failed" }, 400);
  }
});

app.openapi(v1DeleteStoreRoute, async (ctx) => {
  const storeId = ctx.req.param("store");
  await ctx.var.oxigraphService.removeStore(storeId);
  return ctx.body(null, 204);
});
