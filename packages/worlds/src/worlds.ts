import type { WorldsOptions } from "./options.ts";
import { RemoteWorlds } from "./remote.ts";
import type { WorldsInterface } from "./types.ts";
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
 * Worlds is the main entry point for the Worlds API SDK.
 * It can act as a local engine or a remote client.
 */
export class Worlds implements WorldsInterface {
  private readonly engine: WorldsInterface;

  /**
   * constructor initializes the Worlds SDK.
   * @param options The configuration options.
   */
  public constructor(options: WorldsOptions) {
    if (options.engine) {
      this.engine = options.engine;
    } else if (options.baseUrl && options.apiKey) {
      this.engine = new RemoteWorlds(
        options as WorldsOptions & { baseUrl: string; apiKey: string },
      );
    } else {
      throw new Error("Either engine or baseUrl/apiKey must be provided");
    }
  }

  /**
   * list paginates all available worlds.
   * @param options Pagination options.
   * @returns A list of worlds.
   */
  public list(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<World[]> {
    return this.engine.list(options);
  }

  /**
   * get fetches a single world by its ID.
   */
  public get(id: string): Promise<World | null> {
    return this.engine.get(id);
  }

  /**
   * create creates a new isolated world.
   */
  public create(data: CreateWorldParams): Promise<World> {
    return this.engine.create(data);
  }

  /**
   * update updates an existing world's metadata.
   */
  public update(id: string, data: UpdateWorldParams): Promise<void> {
    return this.engine.update(id, data);
  }

  /**
   * delete permanently removes a world.
   */
  public delete(id: string): Promise<void> {
    return this.engine.delete(id);
  }

  /**
   * sparql executes a SPARQL query or update against a world.
   */
  public sparql(
    id: string,
    query: string,
    options?: {
      defaultGraphUris?: string[];
      namedGraphUris?: string[];
    },
  ): Promise<ExecuteSparqlOutput> {
    return this.engine.sparql(id, query, options);
  }

  /**
   * ask performs a deterministic boolean check (SPARQL ASK).
   */
  public ask(
    id: string,
    queryOrTriple: string,
  ): Promise<boolean> {
    return this.engine.ask(id, queryOrTriple);
  }

  /**
   * search performs semantic or text search on triples.
   */
  public search(
    id: string,
    query: string,
    options?: {
      limit?: number;
      subjects?: string[];
      predicates?: string[];
      types?: string[];
    },
  ): Promise<TripleSearchResult[]> {
    return this.engine.search(id, query, options);
  }

  /**
   * import ingests RDF data into a world.
   */
  public import(
    id: string,
    data: string | ArrayBuffer,
    options?: {
      contentType?: WorldsContentType;
    },
  ): Promise<void> {
    return this.engine.import(id, data, options);
  }

  /**
   * export retrieves a world's facts in the specified RDF content type.
   */
  public export(
    id: string,
    options?: { contentType?: WorldsContentType },
  ): Promise<ArrayBuffer> {
    return this.engine.export(id, options);
  }

  /**
   * getServiceDescription retrieves the SPARQL service description.
   */
  public getServiceDescription(
    id: string,
    options: { endpointUrl: string; contentType?: WorldsContentType },
  ): Promise<string> {
    return this.engine.getServiceDescription(id, options);
  }

  /**
   * listLogs retrieves execution and audit logs.
   */
  public listLogs(
    id: string,
    options?: {
      page?: number;
      pageSize?: number;
      level?: string;
    },
  ): Promise<Log[]> {
    return this.engine.listLogs(id, options);
  }
}
