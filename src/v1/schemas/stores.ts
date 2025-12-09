import { z } from "@hono/zod-openapi";

// Define schemas for RDF/JS terms.

const v1TermSchema = z.object({
  termType: z.enum([
    "NamedNode",
    "BlankNode",
    "Literal",
    "Variable",
    "DefaultGraph",
    "Quad",
  ]),
  value: z.string(),
  language: z.string().optional(),
  datatype: z.object({
    termType: z.literal("NamedNode"),
    value: z.string(),
  }).optional(),
}).describe("An RDF/JS Term");

const v1QuadSchema = z.object({
  subject: v1TermSchema,
  predicate: v1TermSchema,
  object: v1TermSchema,
  graph: v1TermSchema,
}).describe("An RDF/JS Quad");

/**
 * v1StoreParamsSchema represents a store identifier.
 */
export const v1StoreParamsSchema = z.object({
  store: z.string().min(1).openapi({
    param: { name: "store", in: "path" },
    example: "my-graph-db",
  }),
});

export const v1SparqlBindingsSchema = z.record(
  z.string(),
  v1TermSchema.optional(),
);

export const v1QuerySparqlOutputSchema = z.object({
  result: z.union([
    z.string(),
    z.boolean(),
    z.array(v1SparqlBindingsSchema),
    z.array(v1QuadSchema),
  ]).describe(
    "The query result: string for DESCRIBE queries, boolean for ASK queries, array of variable bindings for SELECT queries, or array of RDF quads for CONSTRUCT queries.",
  ),
});

export const v1QuerySparqlInputSchema = z.object({
  query: z.string().describe(
    "A read-only SPARQL query (SELECT, ASK, CONSTRUCT, DESCRIBE). Use this to research the graph structure, find existing entities, or check properties. DO NOT use INSERT/DELETE here.",
  ),
  "default-graph-uri": z.union([z.string(), z.array(z.string())]).optional(),
  "named-graph-uri": z.union([z.string(), z.array(z.string())]).optional(),
});

export const v1UpdateSparqlInputSchema = z.object({
  query: z.string().describe(
    "A modification SPARQL query (INSERT, DELETE, LOAD, CLEAR). Use this to persist new facts or update existing ones. Ensure you have validated the schema and prefixes before executing.",
  ),
  "default-graph-uri": z.union([z.string(), z.array(z.string())]).optional(),
  "named-graph-uri": z.union([z.string(), z.array(z.string())]).optional(),
});

export const v1SparqlFormInputSchema = z.object({
  query: z.string().optional(),
  update: z.string().optional(),
  "default-graph-uri": z.union([z.string(), z.array(z.string())]).optional(),
  "named-graph-uri": z.union([z.string(), z.array(z.string())]).optional(),
});

export const v1SparqlResultsSchema = z.object({
  head: z.object({
    vars: z.array(z.string()).optional(),
  }),
  boolean: z.boolean().optional(),
  results: z.object({
    bindings: z.array(z.record(
      z.string(),
      z.object({
        type: z.string(),
        value: z.string(),
        "xml:lang": z.string().optional(),
        datatype: z.string().optional(),
      }),
    )),
  }).optional(),
});

export const v1StoreSchema = z.object({
  id: z.string(),
}).openapi("V1Store");

export const v1RdfContentSchema = z.unknown().openapi({
  type: "string",
  format: "binary",
});
