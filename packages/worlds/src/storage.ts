import type { Store } from "n3";
import { Store as N3Store } from "n3";

/**
 * WorldOptions contains options for world database operations.
 */
export interface WorldOptions {
  /**
   * id is the world identifier (optional for lookup).
   */
  id?: string;

  /**
   * namespace is the optional namespace (uses internal lookup if not provided).
   */
  namespace?: string;
}

/**
 * WorldsStorage represents the storage for a single world.
 * In the Map-based version, this provides access to an N3 Store.
 */
export interface WorldsStorage {
  /**
   * store is the N3 Store for the world's RDF data.
   */
  store: Store;
}

/**
 * WorldsStorageManager manages world databases.
 */
export interface WorldsStorageManager {
  /**
   * create creates a new world database and returns its storage.
   */
  create(options: WorldOptions): Promise<WorldsStorage>;

  /**
   * get returns the world database for the given namespace and world.
   */
  get(options: WorldOptions): Promise<WorldsStorage>;

  /**
   * delete deletes the world database for the given namespace and world.
   */
  delete(options: WorldOptions): Promise<void>;

  /**
   * close shuts down all managed database connections.
   */
  close(): Promise<void>;

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * MemoryWorldsStorageManager implements WorldsStorageManager using in-memory N3 Stores.
 */
export class MemoryWorldsStorageManager implements WorldsStorageManager {
  private readonly stores = new Map<string, Store>();

  private getStoreKey(options: WorldOptions): string {
    return `${options.namespace ?? "_"}/${options.id ?? "_"}`;
  }

  public create(options: WorldOptions): Promise<WorldsStorage> {
    const key = this.getStoreKey(options);
    if (this.stores.has(key)) {
      throw new Error(`World already exists: ${key}`);
    }
    const store = new N3Store();
    this.stores.set(key, store);
    return { store };
  }

  public get(options: WorldOptions): Promise<WorldsStorage> {
    const key = this.getStoreKey(options);
    let store = this.stores.get(key);
    if (!store) {
      store = new N3Store();
      this.stores.set(key, store);
    }
    return { store };
  }

  public delete(options: WorldOptions): Promise<void> {
    const key = this.getStoreKey(options);
    this.stores.delete(key);
  }

  public close(): Promise<void> {
    this.stores.clear();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
