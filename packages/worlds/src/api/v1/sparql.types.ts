import type { components } from "./types.generated.ts";

/**
 * SparqlQueryRequest represents a request to execute a SPARQL query/update.
 */
export type SparqlQueryRequest = components["schemas"]["SparqlQueryRequest"];

/**
 * SparqlValue represents a single node in a SPARQL result binding.
 */
export type SparqlValue = components["schemas"]["SparqlValue"];

/**
 * SparqlBinding represents a single row (mapping of variables to values) in a SELECT result.
 */
export type SparqlBinding = components["schemas"]["SparqlBinding"];

/**
 * SparqlSelectResult represents the results of a SPARQL SELECT query.
 */
export type SparqlSelectResult = components["schemas"]["SparqlSelectResults"];

/**
 * SparqlAskResult represents the results of a SPARQL ASK query.
 */
export type SparqlAskResult = components["schemas"]["SparqlAskResults"];

/**
 * SparqlQuad represents a single quad in a SPARQL result.
 */
export type SparqlQuad = components["schemas"]["SparqlQuad"];

/**
 * SparqlQuadsResults represents a list of quads from a CONSTRUCT or DESCRIBE query.
 */
export type SparqlQuadsResults = components["schemas"]["SparqlQuadsResults"];

/**
 * SparqlQueryResponse represents any successful SPARQL result (SELECT, ASK, or CONSTRUCT).
 */
export type SparqlQueryResponse = components["schemas"]["SparqlQueryResponse"];

/**
 * SparqlResult is a legacy alias for SparqlQueryResponse.
 */
export type SparqlResult = SparqlQueryResponse;
