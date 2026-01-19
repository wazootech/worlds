import type { SearchResult as _SearchResult } from "@fartlabs/search-store";

/**
 * WorldsOptions are the options for the Worlds API SDK.
 */
export interface WorldsOptions {
  baseUrl: string;
  apiKey: string;

  /**
   * fetch fetches a resource from the network. It returns a `Promise` that
   * resolves to the `Response` to that `Request`, whether it is successful
   * or not.
   */
  fetch?: typeof globalThis.fetch;
}

// TODO: Update SearchResultItem type for consistency with RDF/JS term types.

/**
 * SearchResult represents a search result.
 */
export type SearchResult = _SearchResult<{
  subject: string;
  predicate: string;
  object: string;
}>;

/**
 * CreateWorldParams represents the parameters for creating a world.
 */
export type CreateWorldParams = Omit<
  WorldRecord,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

/**
 * UpdateWorldParams represents the parameters for updating a world.
 */
export type UpdateWorldParams = Partial<CreateWorldParams>;

/**
 * WorldRecord represents a world in the Worlds API.
 */
export interface WorldRecord {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  isPublic: boolean;
}

/**
 * UsageBucketRecord represents usage statistics.
 */
export interface UsageBucketRecord {
  id: string;
  accountId: string;
  worldId: string;
  bucketStartTs: number;
  requestCount: number;
}

/**
 * SparqlValue represents a value in a SPARQL result.
 */
export interface SparqlValue {
  type: "uri" | "literal" | "bnode";
  value: string;
  "xml:lang"?: string;
  datatype?: string;
}

/**
 * SparqlResults represents the results of a SPARQL query.
 */
export type SparqlResults = SparqlSelectResults | SparqlAskResults;

/**
 * SparqlSelectResults represents the results of a SPARQL SELECT query.
 */
export interface SparqlSelectResults {
  head: {
    vars: string[];
    link?: string[];
  };
  results: {
    bindings: Record<string, SparqlValue>[];
  };
  boolean?: undefined;
}

/**
 * SparqlAskResults represents the results of a SPARQL ASK query.
 */
export interface SparqlAskResults {
  head: {
    link?: string[];
  };
  boolean: boolean;
  results?: undefined;
}
