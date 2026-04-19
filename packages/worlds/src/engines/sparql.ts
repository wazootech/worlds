import type {
  WorldsSparqlInput,
  WorldsSparqlOutput,
} from "#/worlds/sparql.schema.ts";
import type { WorldsExportInput, WorldsImportInput } from "#/worlds/schema.ts";

/**
 * SparqlEngine handles RDF store operations.
 * Optional - Worlds provides inline execution if not provided.
 */
export interface SparqlEngine {
  /**
   * sparql executes a SPARQL query against the world.
   */
  sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput>;

  /**
   * import loads data into the world.
   */
  import(input: WorldsImportInput): Promise<void>;

  /**
   * export retrieves world data.
   */
  export(input: WorldsExportInput): Promise<ArrayBuffer>;
}
