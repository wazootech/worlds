import { type Client, createClient } from "@libsql/client";
import type { DatabaseManager, ManagedDatabase } from "#/database/manager.ts";
import { initializeWorldDatabase } from "#/database/init.ts";

/**
 * MemoryDatabaseManager implements DatabaseManager using in-memory databases.
 * Intended for tests; each world gets a separate :memory: client.
 */
export class MemoryDatabaseManager implements DatabaseManager {
  private readonly databases = new Map<string, Client>();

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
    const client = createClient({ url: ":memory:" });
    await initializeWorldDatabase(client, this.dimensions);

    this.databases.set(id, client);
    return {
      database: client,
      url: ":memory:",
    };
  }

  public get(id: string): Promise<ManagedDatabase> {
    const client = this.databases.get(id);
    if (!client) {
      throw new Error(`Database not found: ${id}`);
    }
    return Promise.resolve({ database: client, url: ":memory:" });
  }

  public delete(id: string): Promise<void> {
    this.databases.delete(id);
    return Promise.resolve();
  }
}
