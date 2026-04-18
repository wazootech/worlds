import { Store } from "n3";

/**
 * WorldOptions represents the unique coordinates for a world in storage.
 */
export interface WorldOptions {
  id: string;
  namespace?: string;
}

/**
 * MemoryStoreManager manages in-memory N3 Stores for multiple worlds.
 * It provides a central lookup for world stores and handles cleanup.
 */
export class MemoryStoreManager {
  private readonly stores = new Map<string, Store>();

  private toKey(options: WorldOptions): string {
    return `${options.namespace ?? "default"}:${options.id}`;
  }

  /**
   * create initializes a new store for a world.
   * If the store already exists, it returns the existing one.
   */
  public create(options: WorldOptions): Store {
    const key = this.toKey(options);
    if (!this.stores.has(key)) {
      this.stores.set(key, new Store());
    }
    return this.stores.get(key)!;
  }

  /**
   * get retrieves an existing store for a world.
   * If it doesn't exist, it creates a new empty one.
   */
  public get(options: WorldOptions): Store {
    const key = this.toKey(options);
    if (!this.stores.has(key)) {
      return this.create(options);
    }
    return this.stores.get(key)!;
  }

  /**
   * delete removes a world's store from memory.
   */
  public delete(options: WorldOptions): void {
    const key = this.toKey(options);
    this.stores.delete(key);
  }

  /**
   * close clears all stores from memory.
   */
  public close(): void {
    this.stores.clear();
  }

  public [Symbol.dispose](): void {
    this.close();
  }
}
