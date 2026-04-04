import type { createClient as createTursoClient } from "@tursodatabase/api";
import type { Client } from "@libsql/client";
import { createClient } from "@libsql/client";
import type { DatabaseManager, ManagedDatabase } from "#/database/manager.ts";
import { WorldsRepository } from "#/database/repositories/system/worlds/mod.ts";
import { initializeWorldDatabase } from "#/database/init.ts";

/**
 * TursoClient is the client for the Turso Database API.
 */
export type TursoClient = ReturnType<typeof createTursoClient>;

export class TursoCloudDatabaseManager implements DatabaseManager {
  private readonly initialized = new Set<string>();
  private readonly trackedDatabases = new Map<string, Client>();

  /**
   * constructor initializes the TursoCloudDatabaseManager.
   * @param database The system database client.
   * @param client The Turso API client.
   * @param dimensions The vector dimensions for world databases.
   */
  public constructor(
    private readonly database: Client,
    private readonly client: TursoClient,
    private readonly dimensions: number,
  ) {}

  /**
   * getStorageKey generates a Turso-safe identifier for a world.
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
    // Turso DB names must start with a letter and contain only alphanumeric/hyphens.
    // A hex string is safe as long as it doesn't start with a number (we can prefix it).
    return "w" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * create provisions a new Turso database.
   */
  public async create(
    namespaceId: string,
    slug: string,
  ): Promise<ManagedDatabase> {
    const key = await this.getStorageKey(namespaceId, slug);
    const database = await this.client.databases.create(key);
    const token = await this.client.databases.createToken(key);
    return this.getManagedDatabase(key, database.hostname, token.jwt);
  }

  /**
   * get retrieves an existing Turso database connection.
   */
  public async get(
    namespaceId: string,
    slug: string,
  ): Promise<ManagedDatabase> {
    const key = await this.getStorageKey(namespaceId, slug);
    const worldsRepository = new WorldsRepository(this.database);
    const world = await worldsRepository.get(slug, namespaceId);

    let url = "";
    let authToken = "";

    if (world?.db_hostname && world?.db_token) {
      url = world.db_hostname;
      authToken = world.db_token;
    } else {
      const database = await this.client.databases.get(key);
      const token = await this.client.databases.createToken(key);
      url = database.hostname;
      authToken = token.jwt;
    }

    return this.getManagedDatabase(key, url, authToken);
  }

  private async getManagedDatabase(
    key: string,
    url: string,
    authToken: string,
  ): Promise<ManagedDatabase> {
    const client = this.trackedDatabases.get(key) ?? createClient({
      url: `libsql://${url}`,
      authToken,
    });
    this.trackedDatabases.set(key, client);

    if (!this.initialized.has(key)) {
      await initializeWorldDatabase(client, this.dimensions);
      this.initialized.add(key);
    }

    return {
      database: client,
      url,
      authToken,
    };
  }

  public async delete(namespaceId: string, slug: string): Promise<void> {
    const key = await this.getStorageKey(namespaceId, slug);
    await this.client.databases.delete(key);
  }

  /**
   * close shuts down all managed Turso database connections.
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
