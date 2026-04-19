import { Store } from "n3";

/**
 * StoreEngine is an interface for accessing RDF stores.
 * It can wrap any backend (in-memory, SQLite, remote, etc.) as an RDF/JS store.
 *
 * Key behavior:
 * - getStore() with no args returns the default store
 * - getStore(id) returns store for world-id in default namespace
 * - getStore(undefined, ns) returns default store in namespace ns
 * - getStore(id, ns) returns store for world-id in namespace ns
 */
export interface StoreEngine {
  /**
   * getStore returns an RDF store for the given world/namespace.
   * Returns default store when called with no arguments.
   *
   * @param id - World identifier (optional, defaults to "default")
   * @param namespace - Namespace identifier (optional, defaults to "default")
   */
  getStore(id?: string, namespace?: string): Promise<Store>;
}

/**
 * KvStoreEngine manages in-memory N3 Stores using KV pattern.
 *
 * Multitenancy: Each namespace+world combination maps to a separate Store.
 * Key format: "${namespace}:${world}" (both optional, default to "default")
 *
 * Implementations can swap this for SQLite by changing the Map to use
 * an actual database - the interface contract remains the same.
 */
export class KvStoreEngine implements StoreEngine {
  private readonly stores = new Map<string, Store>();

  private toKey(id?: string, namespace?: string): string {
    return `${namespace ?? "default"}:${id ?? "default"}`;
  }

  getStore(id?: string, namespace?: string): Promise<Store> {
    const key = this.toKey(id, namespace);
    if (!this.stores.has(key)) {
      this.stores.set(key, new Store());
    }
    return Promise.resolve(this.stores.get(key)!);
  }

  public delete(id: string, namespace?: string): void {
    const key = this.toKey(id, namespace);
    this.stores.delete(key);
  }

  public close(): void {
    this.stores.clear();
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    await Promise.resolve(this.close());
  }
}
