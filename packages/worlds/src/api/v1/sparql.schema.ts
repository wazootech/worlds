import { z } from "../../z.ts";
import { z as zod } from "zod";

import {
  contentTypeSchema,
  type ContentType,
} from "./common.schema.ts";
import {
  sourceSchema,
  type Source,
} from "./source.schema.ts";

export { contentTypeSchema, type ContentType };

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
 * SparqlSelectHead represents the head section of SELECT results.
 */
export interface SparqlSelectHead {
  vars: string[];
  link: string[] | null;
}

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

export interface SparqlSelectResults {
  head: SparqlSelectHead;
  results: {
    bindings: SparqlBinding[];
  };
  boolean?: undefined;
}


/**
 * SparqlAskHead represents the head section of ASK results.
 */
export interface SparqlAskHead {
  link: string[] | null;
}

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

export interface SparqlAskResults {
  head: SparqlAskHead;
  boolean: boolean;
  results?: undefined;
}


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
 * SparqlQuadsHead represents the head section of CONSTRUCT/DESCRIBE results.
 */
export interface SparqlQuadsHead {
  link: string[] | null;
}

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

export interface SparqlQuadsResults {
  head: SparqlQuadsHead;
  results: {
    quads: SparqlQuad[];
  };
  boolean?: undefined;
}


/**
 * SparqlQueryRequest represents the parameters for executing a SPARQL query or update.
 */
export interface SparqlQueryRequest {
  sources?: Source[];
  parent?: string;
  query: string;
  defaultGraphUris?: string[];
  namedGraphUris?: string[];
}

export const sparqlQueryRequestSchema = z.object({
  sources: z.array(sourceSchema).optional().describe(
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


/**
 * GetServiceDescriptionRequest represents the parameters for retrieving a SPARQL service description.
 */
export interface GetServiceDescriptionRequest {
  sources?: Source[];
  parent?: string;
  endpointUrl: string;
  contentType?: ContentType;
}

export const getServiceDescriptionRequestSchema = z.object({
  sources: z.array(sourceSchema).optional().describe(
    "The optional list of target worlds.",
  ),
  parent: z.string().optional().describe(
    "The parent resource name (e.g., 'namespaces/default').",
  ),
  endpointUrl: z.url().describe("The URL of the SPARQL endpoint."),
  contentType: contentTypeSchema.optional().describe(
    "Optional RDF serialization content type.",
  ),
});


/**
 * SparqlQueryResponse represents the result of a SPARQL query or update.
 */
export type SparqlQueryResponse =
  | SparqlSelectResults
  | SparqlAskResults
  | SparqlQuadsResults
  | null;

/**
 * sparqlQueryResponseSchema is the Zod schema for SparqlQueryResponse.
 */
export const sparqlQueryResponseSchema = z.union([
  sparqlSelectResultsSchema,
  sparqlAskResultsSchema,
  sparqlQuadsResultsSchema,
  z.literal(null),
]);