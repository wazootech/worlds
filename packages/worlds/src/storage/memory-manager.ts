import { type Client, createClient } from "@libsql/client";
import type { DatabaseManager, ManagedDatabase } from "#/storage/manager.ts";
import { initializeWorldDatabase } from "#/storage/init.ts";

/**
 * MemoryDatabaseManager implements DatabaseManager using in-memory databases.
 * Intended for tests; each world gets a separate :memory: client.
 */
export class MemoryDatabaseManager implements DatabaseManager {
  private readonly databases = new Map<string, Client>();
  private readonly initialized = new Set<string>();

  /**
   * constructor initializes the MemoryDatabaseManager.
   * @param dimensions The vector dimensions for world databases.
   */
  public constructor(private readonly dimensions: number = 768) {}

  /**
   * create provisions a new in-memory database.
   */
  public async create(
    namespaceId: string,
    slug: string,
  ): Promise<ManagedDatabase> {
    return await this.getManagedDatabase(namespaceId, slug, ":memory:");
  }

  /**
   * get returns the LibSQL database for the given namespace and slug.
   */
  public async get(
    namespaceId: string,
    slug: string,
  ): Promise<ManagedDatabase> {
    return await this.getManagedDatabase(namespaceId, slug, ":memory:");
  }

  /**
   * getManagedDatabase retrieves or creates a managed database connection.
   */
  private async getManagedDatabase(
    namespaceId: string,
    slug: string,
    url: string,
  ): Promise<ManagedDatabase> {
    const key = `${namespaceId}:${slug}`;
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

  public delete(namespaceId: string, slug: string): Promise<void> {
    const key = `${namespaceId}:${slug}`;
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

