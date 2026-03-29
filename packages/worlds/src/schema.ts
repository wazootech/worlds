import { z } from "zod";

/**
 * TripleSearchResult represents a search result from the TripleSearch service.
 */
export interface TripleSearchResult {
  /**
   * subject is the subject of the triple.
   */
  subject: string;

  /**
   * predicate is the predicate of the triple.
   */
  predicate: string;

  /**
   * object is the object of the triple.
   */
  object: string;

  /**
   * vecRank is the rank of the result from vector search.
   */
  vecRank: number | null;

  /**
   * ftsRank is the rank of the result from full-text search.
   */
  ftsRank: number | null;

  /**
   * score is the combined search score.
   */
  score: number;

  /**
   * worldId is the ID of the world the triple belongs to.
   */
  worldId?: string;
}

/**
 * Triple represents a basic RDF triple used within the SDK.
 */
export interface Triple {
  /**
   * subject is the subject of the triple.
   */
  subject: string;

  /**
   * predicate is the predicate of the triple.
   */
  predicate: string;

  /**
   * object is the object of the triple.
   */
  object: string;

  /**
   * graph is the optional graph URI.
   */
  graph?: string;
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
  },
);

/**
 * World represents a world in the Worlds API.
 */
export interface World {
  id: string;

  slug: string;

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
  slug: z.string(),
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
  slug: string;

  label: string;

  description?: string | null;
}

/**
 * createWorldParamsSchema is the Zod schema for CreateWorldParams.
 */
export const createWorldParamsSchema: z.ZodType<CreateWorldParams> = z.object({
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
});

/**
 * UpdateWorldParams represents the parameters for updating a world.
 */
export interface UpdateWorldParams {
  slug?: string;

  label?: string;

  description?: string | null;
}

/**
 * updateWorldParamsSchema is the Zod schema for UpdateWorldParams.
 */
export const updateWorldParamsSchema: z.ZodType<UpdateWorldParams> = z.object({
  slug: z.string().optional(),
  label: z.string().optional(),
  description: z.string().nullable().optional(),
});

/**
 * SparqlValue represents a value in a SPARQL result.
 * Supports SPARQL 1.1 types and SPARQL 1.2 (RDF-star) triple terms.
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
  }
  | {
    type: "triple";
    value: {
      subject: SparqlValue;
      predicate: SparqlValue;
      object: SparqlValue;
    };
  };

/**
 * sparqlValueSchema is the Zod schema for SparqlValue.
 * Uses z.lazy for recursive triple term support.
 */
export const sparqlValueSchema: z.ZodType<SparqlValue> = z.lazy(() =>
  z.discriminatedUnion(
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
      z.object({
        type: z.literal("triple"),
        value: z.object({
          subject: sparqlValueSchema,
          predicate: sparqlValueSchema,
          object: sparqlValueSchema,
        }),
      }),
    ],
  )
);

/**
 * SparqlServiceDescription represents a SPARQL 1.1 Service Description.
 */
export interface SparqlServiceDescription {
  endpoint: string;

  supportedLanguages: string[];

  features: string[];

  resultFormats: string[];

  defaultDataset?: {
    graphs: Array<{
      uri?: string;
      isDefault: boolean;
    }>;
  };
}

/**
 * sparqlServiceDescriptionSchema is the Zod schema for SparqlServiceDescription.
 */
export const sparqlServiceDescriptionSchema: z.ZodType<
  SparqlServiceDescription
> = z.object({
  endpoint: z.string().url(),
  supportedLanguages: z.array(z.string()),
  features: z.array(z.string()),
  resultFormats: z.array(z.string()),
  defaultDataset: z.object({
    graphs: z.array(z.object({
      uri: z.string().url().optional(),
      isDefault: z.boolean(),
    })),
  }).optional(),
});

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
 * RdfFormat represents the supported RDF serialization formats.
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
 * Log represents a log entry in a world.
 */
export interface Log {
  id: string;

  worldId: string;

  timestamp: number;

  level: "info" | "warn" | "error" | "debug";

  message: string;

  metadata: Record<string, unknown> | null;
}

/**
 * logSchema is the Zod schema for Log.
 */
export const logSchema: z.ZodType<Log> = z.object({
  id: z.string(),
  worldId: z.string(),
  timestamp: z.number(),
  level: z.enum(["info", "warn", "error", "debug"]),
  message: z.string(),
  metadata: z.record(z.string(), z.any()).nullable(),
});

/**
 * Source represents a data source ID.
 */
export interface Source {
  id: string;

  write?: boolean;

  schema?: boolean;
}

export const sourceSchema: z.ZodType<Source> = z.object({
  id: z.string(),
  write: z.boolean().optional(),
  schema: z.boolean().optional(),
});

/**
 * ErrorResponse is the standard error response format.
 */
export interface ErrorResponse {
  error: {
    message: string;
  };
}

export const errorResponseSchema: z.ZodType<ErrorResponse> = z.object({
  error: z.object({
    message: z.string(),
  }),
});

/**
 * PaginationParams represents the parameters for pagination.
 */
export interface PaginationParams {
  page?: number;

  pageSize?: number;
}

/**
 * paginationParamsSchema is the Zod schema for PaginationParams.
 */
export const paginationParamsSchema: z.ZodType<PaginationParams> = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});
