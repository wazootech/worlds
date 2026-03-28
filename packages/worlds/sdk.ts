import type { WorldsOptions } from "./options.ts";
import { RemoteWorlds } from "./clients/worlds/sdk.ts";
import type { WorldsInterface } from "./clients/worlds/types.ts";

/**
 * Worlds is the main entry point for the Worlds API SDK.
 * It can act as a local driver or a remote client.
 */
export class Worlds implements WorldsInterface {
  private readonly driver: WorldsInterface;

  public constructor(options: WorldsOptions) {
    this.driver = options.driver ?? new RemoteWorlds(options as any);
  }

  public list(params?: any) {
    return this.driver.list(params);
  }

  public get(id: string) {
    return this.driver.get(id);
  }

  public create(data: any) {
    return this.driver.create(data);
  }

  public update(id: string, data: any) {
    return this.driver.update(id, data);
  }

  public delete(id: string) {
    return this.driver.delete(id);
  }

  public sparql(id: string, query: string, params?: any) {
    return this.driver.sparql(id, query, params);
  }

  public search(id: string, query: string, params?: any) {
    return this.driver.search(id, query, params);
  }

  public import(id: string, data: any, params?: any) {
    return this.driver.import(id, data, params);
  }

  public export(id: string, params?: any) {
    return this.driver.export(id, params);
  }

  public getServiceDescription(id: string, params: any) {
    return this.driver.getServiceDescription(id, params);
  }

  public listLogs(id: string, params?: any) {
    return this.driver.listLogs(id, params);
  }
}
