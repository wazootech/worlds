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
   * getStorageKey generates a filesystem-safe identifier for a world.
   */
  private async getStorageKey(
    namespaceId: string,
    slug: string,
  ): Promise<string> {
    const raw = `${namespaceId}:${slug}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * create provisions a new file-based database.
   */
  public async create(
    namespaceId: string,
    slug: string,
  ): Promise<ManagedDatabase> {
    const key = await this.getStorageKey(namespaceId, slug);
    const path = join(this.baseDir, `${key}.db`);
    await Deno.mkdir(this.baseDir, { recursive: true });
    return this.getManagedDatabase(key, `file:${path}`);
  }

  /**
   * get retrieves an existing file-based database.
   */
  public async get(
    namespaceId: string,
    slug: string,
  ): Promise<ManagedDatabase> {
    const key = await this.getStorageKey(namespaceId, slug);
    const worldsRepository = new WorldsRepository(this.database);
    const world = await worldsRepository.get(slug, namespaceId);
    let url = world?.db_hostname;

    if (!url) {
      const path = join(this.baseDir, `${key}.db`);
      url = `file:${path}`;
    }

    return this.getManagedDatabase(key, url);
  }

  private async getManagedDatabase(
    key: string,
    url: string,
  ): Promise<ManagedDatabase> {
    const client = this.trackedDatabases.get(key) ?? createClient({ url });
    this.trackedDatabases.set(key, client);

    if (!this.initialized.has(key)) {
      await initializeWorldDatabase(client, this.dimensions);
      this.initialized.add(key);
    }

    return {
      database: client,
      url,
    };
  }

  public async delete(namespaceId: string, slug: string): Promise<void> {
    const key = await this.getStorageKey(namespaceId, slug);
    const path = join(this.baseDir, `${key}.db`);
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

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
