import { join } from "@std/path";
import type { Client } from "@libsql/client";
import { createClient } from "@libsql/client";
import type { DatabaseManager, ManagedDatabase } from "#/database/manager.ts";
import { WorldsRepository } from "#/database/repositories/system/worlds/mod.ts";

import { initializeWorldDatabase } from "#/database/init.ts";

/**
 * FileDatabaseManager implements DatabaseManager using local files.
 */
export class FileDatabaseManager implements DatabaseManager {
  private readonly initialized = new Set<string>();
  private readonly trackedDatabases = new Map<string, Client>();

  /**
   * constructor initializes the FileDatabaseManager.
   * @param database The system database client.
   * @param baseDir The base directory for world database files.
   * @param dimensions The vector dimensions for world databases.
   */
  public constructor(
    private readonly database: Client,
    private readonly baseDir: string,
    private readonly dimensions: number,
  ) {}

  /**
   * create provisions a new file-based database.
   * @param id The ID of the database to create.
   * @returns A managed database connection.
   */
  public async create(id: string): Promise<ManagedDatabase> {
    const path = join(this.baseDir, `${id}.db`);
    await Deno.mkdir(this.baseDir, { recursive: true });
    return this.getManagedDatabase(id, `file:${path}`);
  }

  public async get(id: string): Promise<ManagedDatabase> {
    const worldsRepository = new WorldsRepository(this.database);
    const world = await worldsRepository.getById(id);
    let url = world?.db_hostname;

    if (!url) {
      const path = join(this.baseDir, `${id}.db`);
      url = `file:${path}`;
    }

    return this.getManagedDatabase(id, url);
  }

  private async getManagedDatabase(
    id: string,
    url: string,
  ): Promise<ManagedDatabase> {
    const client = this.trackedDatabases.get(id) ?? createClient({ url });
    this.trackedDatabases.set(id, client);

    if (!this.initialized.has(id)) {
      await initializeWorldDatabase(client, this.dimensions);
      this.initialized.add(id);
    }

    return {
      database: client,
      url,
    };
  }

  public async delete(id: string): Promise<void> {
    const path = join(this.baseDir, `${id}.db`);
    try {
      await Deno.remove(path);
      // Also try to remove -wal and -shm files if they exist
      await Deno.remove(`${path}-wal`).catch(() => {});
      await Deno.remove(`${path}-shm`).catch(() => {});
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  }

  /**
   * close shuts down all managed file-based database connections.
   */
  public close(): Promise<void> {
    for (const client of this.trackedDatabases.values()) {
      client.close();
    }
    this.trackedDatabases.clear();
    this.database.close(); // Close the system database too
    return Promise.resolve();
  }
}
