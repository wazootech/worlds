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
 * WorldsInterface is the interface for the Worlds API.
 */
export interface WorldsInterface {
  /**
   * list paginates all worlds.
   */
  list(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<World[]>;

  /**
   * get gets a world by its ID.
   */
  get(id: string): Promise<World | null>;

  /**
   * create creates a new world.
   */
  create(data: CreateWorldParams): Promise<World>;

  /**
   * update updates an existing world.
   */
  update(id: string, data: UpdateWorldParams): Promise<void>;

  /**
   * delete deletes a world.
   */
  delete(id: string): Promise<void>;

  /**
   * sparql executes a SPARQL query or update against a world.
   */
  sparql(
    id: string,
    query: string,
    options?: {
      defaultGraphUris?: string[];
      namedGraphUris?: string[];
    },
  ): Promise<ExecuteSparqlOutput>;

  /**
   * search searches a world.
   */
  search(
    id: string,
    query: string,
    options?: {
      limit?: number;
      subjects?: string[];
      predicates?: string[];
      types?: string[];
    },
  ): Promise<TripleSearchResult[]>;

  /**
   * import imports data into a world.
   */
  import(
    id: string,
    data: string | ArrayBuffer,
    options?: {
      format?: RdfFormat;
    },
  ): Promise<void>;

  /**
   * export exports a world in the specified RDF format.
   */
  export(
    id: string,
    options?: { format?: RdfFormat },
  ): Promise<ArrayBuffer>;

  /**
   * getServiceDescription gets the SPARQL service description.
   */
  getServiceDescription(
    id: string,
    options: { endpointUrl: string; format?: RdfFormat },
  ): Promise<string>;

  /**
   * listLogs lists the logs for a world.
   */
  listLogs(
    id: string,
    options?: {
      page?: number;
      pageSize?: number;
      level?: string;
    },
  ): Promise<Log[]>;
}
