import { join } from "@std/path";
import type { Client } from "@libsql/client";
import { createClient } from "@libsql/client";
import type {
  DatabaseManager,
  ManagedDatabase,
} from "#/lib/database/manager.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";

/**
 * FileDatabaseManager implements DatabaseManager using local files.
 */
export class FileDatabaseManager implements DatabaseManager {
  public constructor(
    private readonly database: Client,
    private readonly baseDir: string,
  ) {}

  public async create(id: string): Promise<ManagedDatabase> {
    const path = join(this.baseDir, `${id}.db`);
    await Deno.mkdir(this.baseDir, { recursive: true });
    const url = `file:${path}`;
    return {
      database: createClient({ url }),
      url,
    };
  }

  public async get(id: string): Promise<ManagedDatabase> {
    const worldsService = new WorldsService(this.database);
    const world = await worldsService.getById(id);
    if (world?.db_hostname) {
      return {
        database: createClient({ url: world.db_hostname }),
        url: world.db_hostname,
      };
    }

    const path = join(this.baseDir, `${id}.db`);
    const url = `file:${path}`;
    return {
      database: createClient({ url }),
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
}
