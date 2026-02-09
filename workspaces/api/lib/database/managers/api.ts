import type { createClient as createTursoClient } from "@tursodatabase/api";
import { createClient } from "@libsql/client";
import type {
  DatabaseManager,
  ManagedDatabase,
} from "#/lib/database/manager.ts";
import type { WorldsService } from "#/lib/database/tables/worlds/service.ts";

/**
 * TursoClient is the client for the Turso Database API.
 */
export type TursoClient = ReturnType<typeof createTursoClient>;

/**
 * TursoLibsqlManager implements LibsqlManager using the Turso Database API.
 */
export class TursoLibsqlManager implements DatabaseManager {
  public constructor(
    private readonly client: TursoClient,
    private readonly worldsService: WorldsService,
  ) {}

  public async create(id: string): Promise<ManagedDatabase> {
    const database = await this.client.databases.create(id);
    const token = await this.client.databases.createToken(id);
    return {
      database: createClient({
        url: `libsql://${database.hostname}`,
        authToken: token.jwt,
      }),
      url: database.hostname,
      authToken: token.jwt,
    };
  }

  public async get(id: string): Promise<ManagedDatabase> {
    const world = await this.worldsService.getById(id);
    if (world?.db_hostname && world?.db_token) {
      return {
        database: createClient({
          url: `libsql://${world.db_hostname}`,
          authToken: world.db_token,
        }),
        url: world.db_hostname,
        authToken: world.db_token,
      };
    }

    const database = await this.client.databases.get(id);
    const token = await this.client.databases.createToken(id);
    return {
      database: createClient({
        url: `libsql://${database.hostname}`,
        authToken: token.jwt,
      }),
      url: database.hostname,
      authToken: token.jwt,
    };
  }

  public async delete(id: string): Promise<void> {
    await this.client.databases.delete(id);
  }
}
