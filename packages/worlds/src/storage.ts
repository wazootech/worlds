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
  public async create(options: WorldOptions): Promise<Store> {
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
  public async get(options: WorldOptions): Promise<Store> {
    const key = this.toKey(options);
    if (!this.stores.has(key)) {
      return this.create(options);
    }
    return this.stores.get(key)!;
  }

  /**
   * delete removes a world's store from memory.
   */
  public async delete(options: WorldOptions): Promise<void> {
    const key = this.toKey(options);
    this.stores.delete(key);
  }

  /**
   * close clears all stores from memory.
   */
  public async close(): Promise<void> {
    this.stores.clear();
  }

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  public async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
