import type { Client } from "@libsql/client";
import {
  deleteWorld,
  insertWorld,
  selectAllWorlds,
  selectWorldById,
  selectWorldBySlug,
  updateWorld,
} from "./queries.sql.ts";
import type { WorldRow, WorldTableInsert, WorldTableUpdate } from "./schema.ts";

/**
 * WorldsRepository handles the persistence of world metadata in the system database.
 */
export class WorldsRepository {
  /**
   * constructor initializes the WorldsRepository with a database client.
   * @param db The database client.
   */
  constructor(private readonly db: Client) {}

  /**
   * getById retrieves a world by its unique ID.
   * @param id The world ID.
   * @returns The world row or null if not found.
   */
  async getById(id: string): Promise<WorldRow | null> {
    const result = await this.db.execute({
      sql: selectWorldById,
      args: [id],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      slug: row.slug as string,
      label: row.label as string,
      description: row.description as string | null,
      db_hostname: row.db_hostname as string | null,
      db_token: row.db_token as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      deleted_at: row.deleted_at as number | null,
    };
  }

  /**
   * getBySlug retrieves a world by its URL slug.
   * @param slug The world slug.
   * @returns The world row or null if not found.
   */
  async getBySlug(slug: string): Promise<WorldRow | null> {
    const result = await this.db.execute({
      sql: selectWorldBySlug,
      args: [slug],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      slug: row.slug as string,
      label: row.label as string,
      description: row.description as string | null,
      db_hostname: row.db_hostname as string | null,
      db_token: row.db_token as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      deleted_at: row.deleted_at as number | null,
    };
  }

  /**
   * list retrieves a paginated list of all worlds.
   * @param limit The maximum number of worlds to return.
   * @param offset The number of worlds to skip.
   * @returns An array of world rows.
   */
  async list(
    limit: number,
    offset: number,
  ): Promise<WorldRow[]> {
    const result = await this.db.execute({
      sql: selectAllWorlds,
      args: [limit, offset],
    });
    return (result.rows as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      label: row.label as string,
      description: row.description as string | null,
      db_hostname: row.db_hostname as string | null,
      db_token: row.db_token as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      deleted_at: row.deleted_at as number | null,
    }));
  }

  /**
   * insert creates a new world record.
   * @param world The world data to insert.
   */
  async insert(world: WorldTableInsert): Promise<void> {
    await this.db.execute({
      sql: insertWorld,
      args: [
        world.id,
        world.slug,
        world.label,
        world.description,
        world.db_hostname,
        world.db_token,
        world.created_at,
        world.updated_at,
        world.deleted_at,
      ],
    });
  }

  /**
   * update modifies an existing world record.
   * @param id The ID of the world to update.
   * @param updates The fields to update.
   */
  async update(id: string, updates: WorldTableUpdate): Promise<void> {
    const row = await this.getById(id);
    if (!row) return;
    await this.db.execute({
      sql: updateWorld,
      args: [
        updates.slug ?? row.slug,
        updates.label ?? row.label,
        updates.description ?? row.description,
        updates.updated_at ?? row.updated_at,
        updates.db_hostname ?? row.db_hostname,
        updates.db_token ?? row.db_token,
        updates.deleted_at ?? row.deleted_at,
        id,
      ],
    });
  }

  /**
   * delete removes a world record by its ID.
   * @param id The ID of the world to delete.
   */
  async delete(id: string): Promise<void> {
    await this.db.execute({ sql: deleteWorld, args: [id] });
  }
}
