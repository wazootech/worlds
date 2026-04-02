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
   * create provisions a new Turso database.
   * @param id The ID of the database to create.
   * @returns A managed database connection.
   */
  public async create(id: string): Promise<ManagedDatabase> {
    const database = await this.client.databases.create(id);
    const token = await this.client.databases.createToken(id);
    return this.getManagedDatabase(id, database.hostname, token.jwt);
  }

  /**
   * get retrieves an existing Turso database connection.
   * @param id The ID of the database to retrieve.
   * @returns A managed database connection.
   */
  public async get(id: string): Promise<ManagedDatabase> {
    const worldsRepository = new WorldsRepository(this.database);
    const world = await worldsRepository.getById(id);

    let url = "";
    let authToken = "";

    if (world?.db_hostname && world?.db_token) {
      url = world.db_hostname;
      authToken = world.db_token;
    } else {
      const database = await this.client.databases.get(id);
      const token = await this.client.databases.createToken(id);
      url = database.hostname;
      authToken = token.jwt;
    }

    return this.getManagedDatabase(id, url, authToken);
  }

  private async getManagedDatabase(
    id: string,
    url: string,
    authToken: string,
  ): Promise<ManagedDatabase> {
    const client = this.trackedDatabases.get(id) ?? createClient({
      url: `libsql://${url}`,
      authToken,
    });
    this.trackedDatabases.set(id, client);

    if (!this.initialized.has(id)) {
      await initializeWorldDatabase(client, this.dimensions);
      this.initialized.add(id);
    }

    return {
      database: client,
      url,
      authToken,
    };
  }

  public async delete(id: string): Promise<void> {
    await this.client.databases.delete(id);
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
