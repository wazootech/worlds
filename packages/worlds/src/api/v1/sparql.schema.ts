import { z } from "../../shared/z.ts";
import { z as zod } from "zod";

import {
  type WorldsContentType,
  worldsContentTypeSchema,
  type WorldsSource,
  worldsSourceSchema,
} from "./shared.schema.ts";

export { type WorldsContentType, worldsContentTypeSchema };

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
export const sparqlValueSchema: zod.ZodType<SparqlValue> = z.lazy(() =>



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
export const sparqlServiceDescriptionSchema = z.object({
  endpoint: z.url(),
  supportedLanguages: z.array(z.string()),
  features: z.array(z.string()),
  resultFormats: z.array(z.string()),
  defaultDataset: z.object({
    graphs: z.array(z.object({
      uri: z.url().optional(),
      isDefault: z.boolean(),
    })),
  }).optional(),
});

export type SparqlServiceDescription = z.infer<
  typeof sparqlServiceDescriptionSchema
>;


/**
 * SparqlBinding represents a single result binding.
 */
export type SparqlBinding = Record<string, SparqlValue>;

/**
 * sparqlBindingSchema is the Zod schema for SparqlBinding.
 */
export const sparqlBindingSchema = z.record(


  z.string(),
  sparqlValueSchema,
);

/**
 * SparqlSelectResults represents the results of a SPARQL SELECT query.
 */
export const sparqlSelectResultsSchema = z.object({
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

export type SparqlSelectResults = z.infer<typeof sparqlSelectResultsSchema>;


/**
 * SparqlAskResults represents the results of a SPARQL ASK query.
 */
export const sparqlAskResultsSchema = z.object({
  head: z.object({
    link: z.array(z.string()).nullable().optional(),
  }).transform((h: { link?: string[] | null }) => ({
    ...h,
    link: h.link ?? null,
  })),
  boolean: z.boolean(),
  results: z.undefined().optional(),
});

export type SparqlAskResults = z.infer<typeof sparqlAskResultsSchema>;


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
export const sparqlQuadSchema = z.object({


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
export const sparqlQuadsResultsSchema = z.object({
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

export type SparqlQuadsResults = z.infer<typeof sparqlQuadsResultsSchema>;


/**
 * SparqlQueryRequest represents the parameters for executing a SPARQL query or update.
 */
export const sparqlQueryRequestSchema = z.object({
  sources: z.array(worldsSourceSchema).optional().describe(
    "The optional list of target worlds.",
  ),
  parent: z.string().optional().describe(
    "The parent resource name (e.g., 'namespaces/default').",
  ),
  query: z.string().describe("The SPARQL query or update string."),
  defaultGraphUris: z.array(z.string()).optional().describe(
    "Optional list of default graphs to query.",
  ),
  namedGraphUris: z.array(z.string()).optional().describe(
    "Optional list of named graphs to query.",
  ),
});

export type SparqlQueryRequest = z.infer<typeof sparqlQueryRequestSchema>;



/**
 * GetServiceDescriptionRequest represents the parameters for retrieving a SPARQL service description.
 */
export const getServiceDescriptionRequestSchema = z.object({
  sources: z.array(worldsSourceSchema).optional().describe(
    "The optional list of target worlds.",
  ),
  parent: z.string().optional().describe(
    "The parent resource name (e.g., 'namespaces/default').",
  ),
  endpointUrl: z.url().describe("The URL of the SPARQL endpoint."),
  contentType: worldsContentTypeSchema.optional().describe(
    "Optional RDF serialization content type.",
  ),
});

export type GetServiceDescriptionRequest = z.infer<
  typeof getServiceDescriptionRequestSchema
>;



/**
 * SparqlQueryResponse represents the result of a SPARQL query or update.
 */
export const sparqlQueryResponseSchema = z.union([
  sparqlSelectResultsSchema,
  sparqlAskResultsSchema,
  sparqlQuadsResultsSchema,
  z.literal(null),
]);

export type SparqlQueryResponse = z.infer<typeof sparqlQueryResponseSchema>;
