import { z } from "zod";

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
  /**
   * endpoint is the URL of the SPARQL endpoint.
   */
  endpoint: string;

  /**
   * supportedLanguages is the list of SPARQL languages supported.
   */
  supportedLanguages: string[];

  /**
   * features is the list of SPARQL features supported.
   */
  features: string[];

  /**
   * resultFormats is the list of result formats supported.
   */
  resultFormats: string[];

  /**
   * defaultDataset is the description of the default dataset.
   */
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
  /**
   * head contains the variable names and optional links.
   */
  head: {
    vars: string[];
    link: string[] | null;
  };

  /**
   * results contains the bindings for each result.
   */
  results: {
    bindings: SparqlBinding[];
  };

  /**
   * boolean is undefined for SELECT results.
   */
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
    }).transform((h: { vars: string[]; link?: string[] | null }) => ({
      ...h,
      link: h.link ?? null,
    })),
    results: z.object({
      bindings: z.array(sparqlBindingSchema),
    }),
    boolean: z.undefined().optional(),
  });

/**
 * SparqlAskResults represents the results of a SPARQL ASK query.
 */
export interface SparqlAskResults {
  /**
   * head contains optional links for the result.
   */
  head: {
    link: string[] | null;
  };

  /**
   * boolean is the result of the ASK query.
   */
  boolean: boolean;

  /**
   * results is undefined for ASK results.
   */
  results?: undefined;
}

/**
 * sparqlAskResultsSchema is the Zod schema for SparqlAskResults.
 */
export const sparqlAskResultsSchema: z.ZodType<SparqlAskResults> = z.object({
  head: z.object({
    link: z.array(z.string()).nullable().optional(),
  }).transform((h: { link?: string[] | null }) => ({
    ...h,
    link: h.link ?? null,
  })),
  boolean: z.boolean(),
  results: z.undefined().optional(),
});

/**
 * SparqlQuad represents a single quad result (for CONSTRUCT/DESCRIBE).
 */
export interface SparqlQuad {
  /**
   * subject is the subject (URI or BNode).
   */
  subject: {
    type: "uri" | "bnode";
    value: string;
  };

  /**
   * predicate is the predicate (URI).
   */
  predicate: {
    type: "uri";
    value: string;
  };

  /**
   * object is the object value.
   */
  object: SparqlValue;

  /**
   * graph is the graph where the triple exists.
   */
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
  /**
   * head contains optional links for the result.
   */
  head: {
    link: string[] | null;
  };

  /**
   * results contains the quads found.
   */
  results: {
    quads: SparqlQuad[];
  };

  /**
   * boolean is undefined for QUAD results.
   */
  boolean?: undefined;
}

/**
 * sparqlQuadsResultsSchema is the Zod schema for SparqlQuadsResults.
 */
export const sparqlQuadsResultsSchema: z.ZodType<SparqlQuadsResults> = z
  .object({
    head: z.object({
      link: z.array(z.string()).nullable().optional(),
    }).transform((h: { link?: string[] | null }) => ({
      ...h,
      link: h.link ?? null,
    })),
    results: z.object({
      quads: z.array(sparqlQuadSchema),
    }),
    boolean: z.undefined().optional(),
  });

/**
 * WorldsSparqlInput represents the parameters for executing a SPARQL query or update.
 */
export interface WorldsSparqlInput {
  /**
   * slug is the slug of the target world.
   */
  slug: string;

  /**
   * namespace is the optional namespace of the target world.
   */
  namespace?: string;

  /**
   * query is the SPARQL query or update string.
   */
  query: string;

  /**
   * defaultGraphUris is an optional list of default graphs to query.
   */
  defaultGraphUris?: string[];

  /**
   * namedGraphUris is an optional list of named graphs to query.
   */
  namedGraphUris?: string[];
}

/**
 * worldsSparqlInputSchema is the Zod schema for WorldsSparqlInput.
 */
export const worldsSparqlInputSchema: z.ZodType<WorldsSparqlInput> = z.object({
  slug: z.string().describe("The slug of the target world."),
  namespace: z.string().optional().describe(
    "The optional namespace of the target world.",
  ),
  query: z.string().describe("The SPARQL query or update string."),
  defaultGraphUris: z.array(z.string()).optional().describe(
    "Optional list of default graphs to query.",
  ),
  namedGraphUris: z.array(z.string()).optional().describe(
    "Optional list of named graphs to query.",
  ),
});

/**
 * WorldsContentType represents the supported RDF serialization content types.
 */
export type WorldsContentType =
  | "text/turtle"
  | "application/n-quads"
  | "application/n-triples"
  | "text/n3";

/**
 * worldsContentTypeSchema is the Zod schema for WorldsContentType.
 */
export const worldsContentTypeSchema: z.ZodType<WorldsContentType> = z.enum([
  "text/turtle",
  "application/n-quads",
  "application/n-triples",
  "text/n3",
]);

/**
 * WorldsServiceDescriptionInput represents the parameters for retrieving a SPARQL service description.
 */
export interface WorldsServiceDescriptionInput {
  /**
   * slug is the slug of the target world.
   */
  slug: string;

  /**
   * namespace is the optional namespace of the target world.
   */
  namespace?: string;

  /**
   * endpointUrl is the URL of the SPARQL endpoint.
   */
  endpointUrl: string;

  /**
   * contentType is the optional RDF serialization content type.
   */
  contentType?: WorldsContentType;
}

/**
 * worldsServiceDescriptionInputSchema is the Zod schema for WorldsServiceDescriptionInput.
 */
export const worldsServiceDescriptionInputSchema: z.ZodType<
  WorldsServiceDescriptionInput
> = z.object({
  slug: z.string().describe("The slug of the target world."),
  namespace: z.string().optional().describe(
    "The optional namespace of the target world.",
  ),
  endpointUrl: z.string().url().describe("The URL of the SPARQL endpoint."),
  contentType: worldsContentTypeSchema.optional().describe(
    "Optional RDF serialization content type.",
  ),
});

/**
 * WorldsSparqlOutput represents the result of a SPARQL query or update.
 */
export type WorldsSparqlOutput =
  | SparqlSelectResults
  | SparqlAskResults
  | SparqlQuadsResults
  | null;

/**
 * worldsSparqlOutputSchema is the Zod schema for the output of a SPARQL query or update.
 */
export const worldsSparqlOutputSchema: z.ZodType<WorldsSparqlOutput> = z
  .union([
    sparqlSelectResultsSchema,
    sparqlAskResultsSchema,
    sparqlQuadsResultsSchema,
    z.literal(null),
  ]);
