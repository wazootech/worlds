import type {
  CreateWorldParams,
  ExecuteSparqlOutput,
  Log,
  RdfFormat,
  TripleSearchResult,
  UpdateWorldParams,
  World,
} from "./schema.ts";

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
   * ask performs a deterministic boolean check (SPARQL ASK) against a world.
   */
  ask(
    idOrSlug: string,
    queryOrTriple: string,
  ): Promise<boolean>;

  /**
   * search perform semantic/text search on triples in a world.
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
      format?: RdfFormat;
    },
  ): Promise<void>;

  /**
   * export exports a world in the specified RDF format.
   */
  export(
    idOrSlug: string,
    options?: { format?: RdfFormat },
  ): Promise<ArrayBuffer>;

  /**
   * getServiceDescription gets the SPARQL service description.
   */
  getServiceDescription(
    idOrSlug: string,
    options: { endpointUrl: string; format?: RdfFormat },
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
