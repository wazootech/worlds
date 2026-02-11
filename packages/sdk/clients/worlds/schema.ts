import { z } from "zod";

/**
 * TripleSearchResult represents a search result from the TripleSearch service.
 */
export interface TripleSearchResult {
  subject: string;
  predicate: string;
  object: string;
  vecRank: number | null;
  ftsRank: number | null;
  score: number;
  worldId?: string;
  organizationId?: string;
}

/**
 * tripleSearchResultSchema is the Zod schema for TripleSearchResult.
 */
export const tripleSearchResultSchema: z.ZodType<TripleSearchResult> = z.object(
  {
    subject: z.string(),
    predicate: z.string(),
    object: z.string(),
    vecRank: z.number().nullable(),
    ftsRank: z.number().nullable(),
    score: z.number(),
    worldId: z.string().optional(),
    organizationId: z.string().optional(),
  },
);

/**
 * World represents a world in the Worlds API.
 */
export interface World {
  id: string;
  organizationId: string | null;
  label: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/**
 * worldSchema is the Zod schema for World.
 */
export const worldSchema: z.ZodType<World> = z.object({
  id: z.string(),
  organizationId: z.string().nullable(),
  label: z.string(),
  description: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

/**
 * CreateWorldParams represents the parameters for creating a world.
 */
export interface CreateWorldParams {
  organizationId?: string;
  label: string;
  description?: string | null;
}

/**
 * createWorldParamsSchema is the Zod schema for CreateWorldParams.
 */
export const createWorldParamsSchema: z.ZodType<CreateWorldParams> = z.object({
  organizationId: z.string().optional(),
  label: z.string(),
  description: z.string().nullable().optional(),
});

/**
 * UpdateWorldParams represents the parameters for updating a world.
 */
export interface UpdateWorldParams {
  label?: string;
  description?: string | null;
}

/**
 * updateWorldParamsSchema is the Zod schema for UpdateWorldParams.
 */
export const updateWorldParamsSchema: z.ZodType<UpdateWorldParams> = z.object({
  label: z.string().optional(),
  description: z.string().nullable().optional(),
});

/**
 * SparqlValue represents a value in a SPARQL result.
 */
export type SparqlValue =
  | {
    type: "uri";
    value: string;
  }
  | {
    type: "bnode";
    value: string;
  }
  | {
    type: "literal";
    value: string;
    "xml:lang"?: string;
    datatype?: string;
  };

/**
 * sparqlValueSchema is the Zod schema for SparqlValue.
 */
export const sparqlValueSchema: z.ZodType<SparqlValue> = z.discriminatedUnion(
  "type",
  [
    z.object({
      type: z.literal("uri"),
      value: z.string(),
    }),
    z.object({
      type: z.literal("bnode"),
      value: z.string(),
    }),
    z.object({
      type: z.literal("literal"),
      value: z.string(),
      "xml:lang": z.string().optional(),
      datatype: z.string().optional(),
    }),
  ],
);

/**
 * SparqlBinding represents a single result binding.
 */
export type SparqlBinding = Record<string, SparqlValue>;

/**
 * sparqlBindingSchema is the Zod schema for SparqlBinding.
 */
export const sparqlBindingSchema: z.ZodType<SparqlBinding> = z.record(
  z.string(),
  sparqlValueSchema,
);

/**
 * SparqlSelectResults represents the results of a SPARQL SELECT query.
 */
export interface SparqlSelectResults {
  head: {
    vars: string[];
    link: string[] | null;
  };
  results: {
    bindings: SparqlBinding[];
  };
  boolean?: undefined;
}

/**
 * sparqlSelectResultsSchema is the Zod schema for SparqlSelectResults.
 */
export const sparqlSelectResultsSchema: z.ZodType<SparqlSelectResults> = z
  .object({
    head: z.object({
      vars: z.array(z.string()),
      link: z.array(z.string()).nullable().optional(),
    }).transform((h) => ({ ...h, link: h.link ?? null })),
    results: z.object({
      bindings: z.array(sparqlBindingSchema),
    }),
    boolean: z.undefined().optional(),
  });

/**
 * SparqlAskResults represents the results of a SPARQL ASK query.
 */
export interface SparqlAskResults {
  head: {
    link: string[] | null;
  };
  boolean: boolean;
  results?: undefined;
}

/**
 * sparqlAskResultsSchema is the Zod schema for SparqlAskResults.
 */
export const sparqlAskResultsSchema: z.ZodType<SparqlAskResults> = z.object({
  head: z.object({
    link: z.array(z.string()).nullable().optional(),
  }).transform((h) => ({ ...h, link: h.link ?? null })),
  boolean: z.boolean(),
  results: z.undefined().optional(),
});

/**
 * SparqlQuad represents a single quad result (for CONSTRUCT/DESCRIBE).
 */
export interface SparqlQuad {
  subject: {
    type: "uri" | "bnode";
    value: string;
  };
  predicate: {
    type: "uri";
    value: string;
  };
  object: SparqlValue;
  graph: {
    type: "default" | "uri";
    value: string;
  };
}

/**
 * sparqlQuadSchema is the Zod schema for SparqlQuad.
 */
export const sparqlQuadSchema: z.ZodType<SparqlQuad> = z.object({
  subject: z.object({
    type: z.enum(["uri", "bnode"]),
    value: z.string(),
  }),
  predicate: z.object({
    type: z.literal("uri"),
    value: z.string(),
  }),
  object: sparqlValueSchema,
  graph: z.object({
    type: z.enum(["default", "uri"]),
    value: z.string(),
  }),
});

/**
 * SparqlQuadsResults represents the results of a SPARQL CONSTRUCT/DESCRIBE query.
 *
 * @remarks
 * This is a non-standard extension to the SPARQL 1.1 Query Results JSON Format.
 * Standard SPARQL 1.1 JSON results only cover SELECT (bindings) and ASK (boolean) queries.
 *
 * This type is used by the Worlds API/SDK to provide a consistent JSON representation
 * for graph queries (CONSTRUCT/DESCRIBE), returning "quads" in a structure similar
 * to "bindings". This avoids the need for clients to parse raw RDF serializations
 * (like Turtle or RDF/XML) when working with JSON-based API workflows.
 */
export interface SparqlQuadsResults {
  head: {
    link: string[] | null;
  };
  results: {
    quads: SparqlQuad[];
  };
  boolean?: undefined;
}

/**
 * sparqlQuadsResultsSchema is the Zod schema for SparqlQuadsResults.
 */
export const sparqlQuadsResultsSchema: z.ZodType<SparqlQuadsResults> = z
  .object({
    head: z.object({
      link: z.array(z.string()).nullable().optional(),
    }).transform((h) => ({ ...h, link: h.link ?? null })),
    results: z.object({
      quads: z.array(sparqlQuadSchema),
    }),
    boolean: z.undefined().optional(),
  });

/**
 * ExecuteSparqlOutput represents the result of a SPARQL query or update.
 */
export type ExecuteSparqlOutput =
  | SparqlSelectResults
  | SparqlAskResults
  | SparqlQuadsResults
  | null;

/**
 * executeSparqlOutputSchema is the Zod schema for the output of a SPARQL query or update.
 */
export const executeSparqlOutputSchema: z.ZodType<ExecuteSparqlOutput> = z
  .union([
    sparqlSelectResultsSchema,
    sparqlAskResultsSchema,
    sparqlQuadsResultsSchema,
    z.literal(null),
  ]);

/**
 * RdfFormat represents the supported RDF serialization formats for download.
 */
export type RdfFormat = "turtle" | "n-quads" | "n-triples" | "n3";

/**
 * rdfFormatSchema is the Zod schema for RdfFormat.
 */
export const rdfFormatSchema: z.ZodType<RdfFormat> = z.enum([
  "turtle",
  "n-quads",
  "n-triples",
  "n3",
]);

/**
 * worldIdsParamSchema validates comma-separated world IDs.
 * Ensures the array is not too large and each ID is a valid string.
 */
export const worldIdsParamSchema: z.ZodType<string[]> = z.array(
  z.string().min(1),
).max(50);
