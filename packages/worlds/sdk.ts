import type { WorldsOptions } from "./options.ts";
import { RemoteWorlds } from "./clients/worlds/sdk.ts";
import type { WorldsInterface } from "./clients/worlds/types.ts";
import type {
  CreateWorldParams,
  ExecuteSparqlOutput,
  Log,
  RdfFormat,
  TripleSearchResult,
  UpdateWorldParams,
  World,
} from "./clients/worlds/schema.ts";

/**
 * Worlds is the main entry point for the Worlds API SDK.
 * It can act as a local engine or a remote client.
 */
export class Worlds implements WorldsInterface {
  private readonly engine: WorldsInterface;

  public constructor(options: WorldsOptions) {
    this.engine = options.engine ?? new RemoteWorlds(options);
  }

  public list(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<World[]> {
    return this.engine.list(options);
  }

  public get(id: string): Promise<World | null> {
    return this.engine.get(id);
  }

  public create(data: CreateWorldParams): Promise<World> {
    return this.engine.create(data);
  }

  public update(id: string, data: UpdateWorldParams): Promise<void> {
    return this.engine.update(id, data);
  }

  public delete(id: string): Promise<void> {
    return this.engine.delete(id);
  }

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

  public import(
    id: string,
    data: string | ArrayBuffer,
    options?: {
      format?: RdfFormat;
    },
  ): Promise<void> {
    return this.engine.import(id, data, options);
  }

  public export(
    id: string,
    options?: { format?: RdfFormat },
  ): Promise<ArrayBuffer> {
    return this.engine.export(id, options);
  }

  public getServiceDescription(
    id: string,
    options: { endpointUrl: string; format?: RdfFormat },
  ): Promise<string> {
    return this.engine.getServiceDescription(id, options);
  }

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
