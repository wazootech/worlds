import type { createClient as createTursoClient } from "@tursodatabase/api";
import type { Client } from "@libsql/client";
import { createClient } from "@libsql/client";
import type {
  DatabaseManager,
  ManagedDatabase,
} from "#/lib/database/manager.ts";
import { WorldsRepository } from "#/lib/database/tables/worlds/repository.ts";

import { initializeWorldDatabase } from "#/lib/database/init.ts";

/**
 * TursoClient is the client for the Turso Database API.
 */
export type TursoClient = ReturnType<typeof createTursoClient>;

/**
 * TursoDatabaseManager implements DatabaseManager using the Turso Database API.
 */
export class TursoDatabaseManager implements DatabaseManager {
  private readonly initialized = new Set<string>();

  public constructor(
    private readonly database: Client,
    private readonly client: TursoClient,
    private readonly dimensions: number,
  ) {}

  public async create(id: string): Promise<ManagedDatabase> {
    const database = await this.client.databases.create(id);
    const token = await this.client.databases.createToken(id);
    return this.getManagedDatabase(id, database.hostname, token.jwt);
  }

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
    const client = createClient({
      url: `libsql://${url}`,
      authToken,
    });

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
}
