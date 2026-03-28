import type { WorldsOptions } from "./options.ts";
import { RemoteWorlds } from "./clients/worlds/sdk.ts";
import type { WorldsInterface } from "./clients/worlds/types.ts";

/**
 * Worlds is the main entry point for the Worlds API SDK.
 * It can act as a local driver or a remote client.
 */
export class Worlds implements WorldsInterface {
  private readonly engine: WorldsInterface;

  public constructor(options: WorldsOptions) {
    this.engine = options.engine ?? new RemoteWorlds(options as any);
  }

  public list(params?: any) {
    return this.engine.list(params);
  }

  public get(id: string) {
    return this.engine.get(id);
  }

  public create(data: any) {
    return this.engine.create(data);
  }

  public update(id: string, data: any) {
    return this.engine.update(id, data);
  }

  public delete(id: string) {
    return this.engine.delete(id);
  }

  public sparql(id: string, query: string, params?: any) {
    return this.engine.sparql(id, query, params);
  }

  public search(id: string, query: string, params?: any) {
    return this.engine.search(id, query, params);
  }

  public import(id: string, data: any, params?: any) {
    return this.engine.import(id, data, params);
  }

  public export(id: string, params?: any) {
    return this.engine.export(id, params);
  }

  public getServiceDescription(id: string, params: any) {
    return this.engine.getServiceDescription(id, params);
  }

  public listLogs(id: string, params?: any) {
    return this.engine.listLogs(id, params);
  }
}
