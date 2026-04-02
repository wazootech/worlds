import type { WorldsOptions } from "./types.ts";
import { RemoteWorlds } from "./remote.ts";
import type { WorldsInterface } from "./types.ts";
import type {
  Log,
  World,
  WorldsCreateInput,
  WorldsDeleteInput,
  WorldsExportInput,
  WorldsGetInput,
  WorldsImportInput,
  WorldsListInput,
  WorldsLogsInput,
  WorldsSearchInput,
  WorldsSearchOutput,
  WorldsServiceDescriptionInput,
  WorldsSparqlInput,
  WorldsSparqlOutput,
  WorldsUpdateInput,
} from "./schemas/mod.ts";

/**
 * Worlds is the main entry point for the Worlds API SDK.
 */
export class Worlds implements WorldsInterface {
  private readonly engine: WorldsInterface;

  /**
   * Worlds initializes the Worlds SDK.
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
   */
  public list(input?: WorldsListInput): Promise<World[]> {
    return this.engine.list(input);
  }

  /**
   * get fetches a single world by its ID.
   */
  public get(input: WorldsGetInput): Promise<World | null> {
    return this.engine.get(input);
  }

  /**
   * delete permanently removes a world.
   */
  public delete(input: WorldsDeleteInput): Promise<void> {
    return this.engine.delete(input);
  }

  /**
   * sparql executes a SPARQL query or update against a world.
   */
  public sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    return this.engine.sparql(input);
  }

  /**
   * create creates a new isolated world.
   */
  public create(input: WorldsCreateInput): Promise<World> {
    return this.engine.create(input);
  }

  /**
   * update updates an existing world's metadata.
   */
  public update(input: WorldsUpdateInput): Promise<void> {
    return this.engine.update(input);
  }

  /**
   * search performs semantic or text search on triples.
   */
  public search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    return this.engine.search(input);
  }

  /**
   * import ingests RDF data into a world.
   */
  public import(input: WorldsImportInput): Promise<void> {
    return this.engine.import(input);
  }

  /**
   * export retrieves a world's facts in the specified RDF content type.
   */
  public export(input: WorldsExportInput): Promise<ArrayBuffer> {
    return this.engine.export(input);
  }

  /**
   * getServiceDescription retrieves the SPARQL service description.
   */
  public getServiceDescription(
    input: WorldsServiceDescriptionInput,
  ): Promise<string> {
    return this.engine.getServiceDescription(input);
  }

  /**
   * listLogs retrieves execution and audit logs.
   */
  public listLogs(input: WorldsLogsInput): Promise<Log[]> {
    return this.engine.listLogs(input);
  }
}
