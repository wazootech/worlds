import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { type Quad, type Term } from "oxigraph";
import type { OxigraphServiceEnv } from "../route.ts";
import {
  v1QuerySparqlInputSchema,
  v1RdfContentSchema,
  v1SparqlFormInputSchema,
  v1SparqlResultsSchema,
  v1StoreParamsSchema,
} from "#/v1/schemas/stores.ts";

export const app = new OpenAPIHono<OxigraphServiceEnv>();

export const v1SparqlRoute = createRoute({
  method: "get",
  path: "/v1/stores/{store}/sparql",
  description: "Execute a SPARQL query (read-only)",
  request: {
    params: v1StoreParamsSchema,
    query: v1QuerySparqlInputSchema,
  },
  responses: {
    200: {
      description: "Query results",
      content: {
        "application/sparql-results+json": { schema: v1SparqlResultsSchema },
        "application/sparql-results+xml": { schema: z.string() },
        "text/csv": { schema: z.string() },
        "application/n-quads": { schema: v1RdfContentSchema },
        "text/turtle": { schema: v1RdfContentSchema },
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
          schema: v1SparqlFormInputSchema,
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
        "application/sparql-results+json": { schema: v1SparqlResultsSchema },
        "application/sparql-results+xml": { schema: z.string() },
        "text/csv": { schema: z.string() },
      },
    },
    204: { description: "Update successful (no content)" },
    400: { description: "Bad Request" },
  },
});

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

// Helper to serialize result to SPARQL Query Results JSON Format
function serializeSparqlJson(
  result: boolean | Map<string, Term>[] | Quad[] | string,
): unknown {
  // Boolean result (ASK)
  if (typeof result === "boolean") {
    return { head: {}, boolean: result };
  }

  // SELECT result (Array of Maps) or CONSTRUCT result (Array of Quads)
  if (Array.isArray(result)) {
    if (result.length === 0) {
      return { head: { vars: [] }, results: { bindings: [] } };
    }

    if (result[0] instanceof Map) {
      const vars = new Set<string>();
      const bindings = (result as Map<string, Term>[]).map((binding) => {
        const obj: Record<string, unknown> = {};
        for (const [varName, term] of binding.entries()) {
          vars.add(varName);
          obj[varName] = serializeTerm(term);
        }
        return obj;
      });

      return {
        head: { vars: Array.from(vars) },
        results: { bindings },
      };
    } else {
      // CONSTRUCT/DESCRIBE result (Array of Quads)
      return (result as Quad[]).map((quad) => ({
        subject: serializeTerm(quad.subject),
        predicate: serializeTerm(quad.predicate),
        object: serializeTerm(quad.object),
        graph: serializeTerm(quad.graph),
      }));
    }
  }

  return result;
}

function serializeTerm(term: Term): unknown {
  if (term.termType === "NamedNode") {
    return { type: "uri", value: term.value };
  } else if (term.termType === "BlankNode") {
    return { type: "bnode", value: term.value };
  } else if (term.termType === "Literal") {
    const result: Record<string, string> = {
      type: "literal",
      value: term.value,
    };
    if (term.language) {
      result["xml:lang"] = term.language;
    } else if (
      term.datatype &&
      term.datatype.value !== "http://www.w3.org/2001/XMLSchema#string"
    ) {
      result.datatype = term.datatype.value;
    }
    return result;
  } else if (term.termType === "DefaultGraph") {
    return null;
  }
  // Fallback for unexpected objects
  return { type: "unknown", value: String(term.value) };
}
