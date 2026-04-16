import { type Client, createClient } from "@libsql/client";
import type {
  WorldOptions,
  WorldsStorage,
  WorldsStorageManager,
} from "#/storage/worlds.ts";
import { toWorldName } from "#/core/sources.ts";
import { initializeWorldDatabase } from "#/storage/init.ts";

/**
 * MemoryWorldsStorageManager implements WorldsStorageManager using in-memory databases.
 * Intended for tests; each world gets a separate :memory: client.
 */
export class MemoryWorldsStorageManager implements WorldsStorageManager {
  private readonly databases = new Map<string, Client>();
  private readonly initialized = new Set<string>();

  /**
   * constructor initializes the MemoryWorldsStorageManager.
   * @param dimensions The vector dimensions for world databases.
   */
  public constructor(private readonly dimensions: number = 768) {}

  /**
   * create provisions a new in-memory database.
   */
  public async create(options: WorldOptions): Promise<WorldsStorage> {
    return await this.getWorldsStorage(options, ":memory:");
  }

  /**
   * get returns the LibSQL database for the given namespace and world.
   */
  public async get(options: WorldOptions): Promise<WorldsStorage> {
    return await this.getWorldsStorage(options, ":memory:");
  }

  /**
   * getWorldsStorage retrieves or creates a world storage connection.
   */
  private async getWorldsStorage(
    options: WorldOptions,
    url: string,
  ): Promise<WorldsStorage> {
    const key = toWorldName(options);
    const client = this.databases.get(key) ?? createClient({ url });
    this.databases.set(key, client);

    if (!this.initialized.has(key)) {
      await client.execute("PRAGMA foreign_keys = ON;");
      await initializeWorldDatabase(client, this.dimensions);
      this.initialized.add(key);
    } else {
      await client.execute("PRAGMA foreign_keys = ON;");
    }

    return {
      database: client,
      url,
    };
  }

  public delete(options: WorldOptions): Promise<void> {
    const key = toWorldName(options);
    this.databases.delete(key);
    this.initialized.delete(key);
    return Promise.resolve();
  }

  /**
   * close shuts down all managed in-memory database connections.
   */
  public close(): Promise<void> {
    for (const client of this.databases.values()) {
      client.close();
    }
    this.databases.clear();
    return Promise.resolve();
  }

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
