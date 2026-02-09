import { join } from "@std/path";
import { createClient } from "@libsql/client";
import type {
  DatabaseManager,
  ManagedDatabase,
} from "#/lib/database/manager.ts";
import type { WorldsService } from "#/lib/database/tables/worlds/service.ts";

/**
 * FileLibsqlManager implements LibsqlManager using local files.
 */
export class FileLibsqlManager implements DatabaseManager {
  public constructor(
    private readonly baseDir: string,
    private readonly _worldsService: WorldsService,
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
    const world = await this._worldsService.getById(id);
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
