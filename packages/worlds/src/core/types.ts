import type { Client } from "@libsql/client";
import type { Embeddings } from "#/embeddings/embeddings.ts";
import type { DatabaseManager } from "#/storage/manager.ts";
import type {
  World,
  WorldsCreateInput,
  WorldsDeleteInput,
  WorldsExportInput,
  WorldsGetInput,
  WorldsImportInput,
  WorldsListInput,
  WorldsSearchInput,
  WorldsSearchOutput,
  WorldsServiceDescriptionInput,
  WorldsSparqlInput,
  WorldsSparqlOutput,
  WorldsUpdateInput,
} from "#/schemas/mod.ts";

/**
 * WorldsOptions are the options for the Worlds API SDK.
 */
export interface WorldsOptions {
  /**
   * engine is an optional local engine for the Worlds API.
   * If provided, the SDK will use this engine instead of making remote requests.
   */
  engine?: WorldsInterface;

  /**
   * baseUrl is the base URL of the Worlds API. It should not include the /v1 suffix.
   */
  baseUrl?: string;

  /**
   * apiKey is the API key for the Worlds API.
   */
  apiKey?: string;

  /**
   * fetch fetches a resource from the network. It returns a `Promise` that
   * resolves to the `Response` to that `Request`, whether it is successful
   * or not.
   */
  fetch?: typeof globalThis.fetch;
}

/**
 * WorldsContext is the shared context for the Worlds engine.
 */
export interface WorldsContext {
  /**
   * apiKey is an optional API key for authentication.
   */
  apiKey?: string;

  /**
   * embeddings is the embedding strategy used for semantic search.
   */
  embeddings: Embeddings;

  /**
   * libsql contains the database client and manager.
   */
  libsql: {
    /**
     * database is the core LibSQL database client.
     */
    database: Client;

    /**
     * manager is the database manager for world-specific databases.
     */
    manager: DatabaseManager;
  };

  /**
   * namespace is the default namespace for this context.
   */
  namespace?: string;

  /**
   * engine is the core Worlds engine for this context.
   */
  engine?: WorldsInterface;

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * WorldsInterface is the core interface for interacting with Worlds.
 * It is implemented by both LocalWorlds (server-side engine) and RemoteWorlds (client-side SDK).
 */
export interface WorldsInterface {
  /**
   * list paginates all available worlds.
   */
  list(input?: WorldsListInput): Promise<World[]>;

  /**
   * get fetches a single world by its ID or slug.
   */
  get(input: WorldsGetInput): Promise<World | null>;

  /**
   * create creates a new world.
   */
  create(input: WorldsCreateInput): Promise<World>;

  /**
   * update updates an existing world.
   */
  update(input: WorldsUpdateInput): Promise<void>;

  /**
   * delete deletes a world.
   */
  delete(input: WorldsDeleteInput): Promise<void>;

  /**
   * sparql executes a SPARQL query or update against a world.
   */
  sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput>;

  /**
   * search performs semantic/text search on triples in a world.
   */
  search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]>;

  /**
   * import imports RDF data into a world.
   */
  import(input: WorldsImportInput): Promise<void>;

  /**
   * export exports a world in the specified RDF content type.
   */
  export(input: WorldsExportInput): Promise<ArrayBuffer>;

  /**
   * getServiceDescription gets the SPARQL service description.
   */
  getServiceDescription(input: WorldsServiceDescriptionInput): Promise<string>;

  /**
   * init initializes the engine and its background tasks.
   */
  init(): Promise<void>;

  /**
   * close shuts down the engine and all managed database connections.
   */
  close(): Promise<void>;

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  [Symbol.asyncDispose](): Promise<void>;
}
