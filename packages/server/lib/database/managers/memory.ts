import { type Client, createClient } from "@libsql/client";
import type {
  DatabaseManager,
  ManagedDatabase,
} from "#/lib/database/manager.ts";
import { initializeWorldDatabase } from "#/lib/database/init.ts";

/**
 * MemoryDatabaseManager implements DatabaseManager using in-memory databases.
 * databases. Intended for tests; each world gets a separate :memory: client
 * stored in a Map.
 */
export class MemoryDatabaseManager implements DatabaseManager {
  private readonly databases = new Map<string, Client>();

  public constructor(private readonly dimensions: number = 1536) {}

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
