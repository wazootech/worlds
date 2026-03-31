import type { Client } from "@libsql/client";
import type { Embeddings } from "#/embeddings/embeddings.ts";
import type { DatabaseManager } from "#/database/manager.ts";
import type {
  CreateWorldParams,
  ExecuteSparqlOutput,
  Log,
  TripleSearchResult,
  UpdateWorldParams,
  World,
  WorldsContentType,
} from "./schema.ts";

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
}

/**
 * WorldsInterface is the core interface for interacting with Worlds.
 * It is implemented by both LocalWorlds (server-side engine) and RemoteWorlds (client-side SDK).
 */
export interface WorldsInterface {
  /**
   * list paginates all available worlds.
   */
  list(options?: {
    limit?: number;
    offset?: number;
    page?: number; // Convenience
    pageSize?: number; // Convenience
  }): Promise<World[]>;

  /**
   * get fetches a single world by its ID or slug.
   */
  get(idOrSlug: string): Promise<World | null>;

  /**
   * create creates a new world.
   */
  create(params: CreateWorldParams): Promise<World>;

  /**
   * update updates an existing world.
   */
  update(idOrSlug: string, params: UpdateWorldParams): Promise<void>;

  /**
   * delete deletes a world.
   */
  delete(idOrSlug: string): Promise<void>;

  /**
   * sparql executes a SPARQL query or update against a world.
   */
  sparql(
    idOrSlug: string,
    query: string,
    options?: {
      defaultGraphUris?: string[];
      namedGraphUris?: string[];
    },
  ): Promise<ExecuteSparqlOutput>;

  /**
   * search performs semantic/text search on triples in a world.
   */
  search(
    idOrSlug: string,
    query: string,
    options?: {
      limit?: number;
      subjects?: string[];
      predicates?: string[];
      types?: string[];
    },
  ): Promise<TripleSearchResult[]>;

  /**
   * import imports RDF data into a world.
   */
  import(
    idOrSlug: string,
    data: string | ArrayBuffer,
    options?: {
      contentType?: WorldsContentType;
    },
  ): Promise<void>;

  /**
   * export exports a world in the specified RDF content type.
   */
  export(
    idOrSlug: string,
    options?: { contentType?: WorldsContentType },
  ): Promise<ArrayBuffer>;

  /**
   * getServiceDescription gets the SPARQL service description.
   */
  getServiceDescription(
    idOrSlug: string,
    options: { endpointUrl: string; contentType?: WorldsContentType },
  ): Promise<string>;

  /**
   * listLogs lists the execution/audit logs for a world.
   */
  listLogs(
    idOrSlug: string,
    options?: {
      page?: number;
      pageSize?: number;
      level?: string;
    },
  ): Promise<Log[]>;
}
