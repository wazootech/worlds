import type {
  SparqlQueryRequest,
  SparqlQueryResponse,
  ExportWorldRequest,
  ImportWorldRequest,
} from "../schema.ts";


/**
 * SparqlEngine handles RDF store operations.
 * Optional - Worlds provides inline execution if not provided.
 */
export interface SparqlEngine {
  /**
   * sparql executes a SPARQL query against the world.
   */
  sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse>;

  /**
   * import loads data into the world.
   */
  import(input: ImportWorldRequest): Promise<void>;

  /**
   * export retrieves world data.
   */
  export(input: ExportWorldRequest): Promise<ArrayBuffer>;
}
