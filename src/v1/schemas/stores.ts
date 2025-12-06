import { z } from "@hono/zod-openapi";
// Define schemas for RDF/JS terms
const termSchema = z.object({
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

const quadSchema = z.object({
  subject: termSchema,
  predicate: termSchema,
  object: termSchema,
  graph: termSchema,
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
  termSchema.optional(),
);

export const v1QuerySparqlOutputSchema = z.object({
  result: z.union([
    z.string(),
    z.boolean(),
    z.array(v1SparqlBindingsSchema),
    z.array(quadSchema),
  ]).describe(
    "The query result: string for DESCRIBE queries, boolean for ASK queries, array of variable bindings for SELECT queries, or array of RDF quads for CONSTRUCT queries.",
  ),
});

export const v1QuerySparqlInputSchema = z.object({
  query: z.string().describe(
    "A read-only SPARQL query (SELECT, ASK, CONSTRUCT, DESCRIBE). Use this to research the graph structure, find existing entities, or check properties. DO NOT use INSERT/DELETE here.",
  ),
});

export const v1UpdateSparqlInputSchema = z.object({
  query: z.string().describe(
    "A modification SPARQL query (INSERT, DELETE, LOAD, CLEAR). Use this to persist new facts or update existing ones. Ensure you have validated the schema and prefixes before executing.",
  ),
});

export const v1StoreSchema = z.object({
  id: z.string(),
}).openapi("V1Store");
