import { type Client, createClient } from "@libsql/client";
import type { DatabaseManager, ManagedDatabase } from "#/database/manager.ts";
import { initializeWorldDatabase } from "#/database/init.ts";

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
   * @param id The ID of the database to create.
   * @returns A managed database connection.
   */
  public async create(id: string): Promise<ManagedDatabase> {
    return await this.getManagedDatabase(id, ":memory:");
  }

  /**
   * get returns the LibSQL database for the given id.
   * @param id The ID of the database.
   * @returns A managed database connection.
   */
  public async get(id: string): Promise<ManagedDatabase> {
    return await this.getManagedDatabase(id, ":memory:");
  }

  /**
   * getManagedDatabase retrieves or creates a managed database connection.
   * @param id The ID of the database.
   * @param url The database connection URL.
   * @returns A managed database connection.
   */
  private async getManagedDatabase(
    id: string,
    url: string,
  ): Promise<ManagedDatabase> {
    const client = this.databases.get(id) ?? createClient({ url });
    this.databases.set(id, client);

    if (!this.initialized.has(id)) {
      await initializeWorldDatabase(client, this.dimensions);
      this.initialized.add(id);
    }

    return {
      database: client,
      url,
    };
  }

  public delete(id: string): Promise<void> {
    this.databases.delete(id);
    this.initialized.delete(id);
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
}
