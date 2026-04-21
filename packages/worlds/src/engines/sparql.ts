import type {
  SparqlQueryRequest,
  SparqlQueryResult,
} from "#/worlds/sparql.schema.ts";

import type { ExportWorldRequest, ImportWorldRequest } from "#/worlds/schema.ts";


/**
 * SparqlEngine handles RDF store operations.
 * Optional - Worlds provides inline execution if not provided.
 */
export interface SparqlEngine {
  /**
   * sparql executes a SPARQL query against the world.
   */
  sparql(input: SparqlQueryRequest): Promise<SparqlQueryResult>;


  /**
   * import loads data into the world.
   */
  import(input: ImportWorldRequest): Promise<void>;

  /**
   * export retrieves world data.
   */
  export(input: ExportWorldRequest): Promise<ArrayBuffer>;
}
