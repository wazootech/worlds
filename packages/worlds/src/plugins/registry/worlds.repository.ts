import type { Client } from "@libsql/client";
import {
  deleteWorld,
  insertWorld,
  selectAllWorlds,
  selectWorldBySlug,
  selectWorldBySlugInternal,
  updateWorld,
} from "./worlds.queries.sql.ts";
import type { WorldRow, WorldTableInsert, WorldTableUpdate } from "./worlds.schema.ts";

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
   * get retrieves a world by its identifier and optional namespace.
   * @param world The world identifier.
   * @param namespace The namespace ID (optional - uses internal lookup if not provided).
   * @returns The world row or null if not found.
   */
  async get(world: string, namespace?: string): Promise<WorldRow | null> {
    if (namespace) {
      const result = await this.db.execute({
        sql: selectWorldBySlug,
        args: [world, namespace],
      });
      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;
      return this.mapRow(row);
    }
    return this.getInternal(world);
  }

  /**
   * getInternal retrieves a world by its identifier without namespace scoping.
   * Use this ONLY for internal system operations.
   * @param world The world identifier.
   * @returns The world row or null if not found.
   */
  async getInternal(world: string): Promise<WorldRow | null> {
    const result = await this.db.execute({
      sql: selectWorldBySlugInternal,
      args: [world],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * mapRow maps a database row to a WorldRow.
   */
  private mapRow(row: Record<string, unknown>): WorldRow {
    return {
      namespace_id: row.namespace_id as string,
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
   * list retrieves a paginated list of worlds for a specific namespace.
   * @param namespace The namespace ID (optional - if not provided, lists all worlds).
   * @param limit The maximum number of worlds to return.
   * @param offset The number of worlds to skip.
   * @returns An array of world rows.
   */
  async list(
    namespace: string | undefined,
    limit: number,
    offset: number,
  ): Promise<WorldRow[]> {
    const result = namespace
      ? await this.db.execute({
          sql: selectAllWorlds,
          args: [namespace, limit, offset],
        })
      : await this.db.execute({
          sql: `SELECT * FROM worlds ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          args: [limit, offset],
        });
    return (result.rows as Record<string, unknown>[]).map((row) => ({
      namespace_id: row.namespace_id as string,
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
        world.namespace_id,
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
   * @param world The world identifier.
   * @param namespace The namespace ID.
   * @param updates The fields to update.
   */
  async update(
    world: string,
    namespace: string | undefined,
    updates: WorldTableUpdate,
  ): Promise<void> {
    const row = await this.get(world, namespace);
    if (!row) return;
    const ns = namespace ?? "";
    await this.db.execute({
      sql: updateWorld,
      args: [
        updates.label ?? row.label,
        updates.description ?? row.description,
        updates.updated_at ?? row.updated_at,
        updates.db_hostname ?? row.db_hostname,
        updates.db_token ?? row.db_token,
        updates.deleted_at ?? row.deleted_at,
        world,
        ns,
      ],
    });
  }

  /**
   * delete removes a world record by its identifier and namespace.
   * @param world The world identifier.
   * @param namespace The namespace ID (optional).
   */
  async delete(world: string, namespace: string | undefined): Promise<void> {
    const ns = namespace ?? "";
    await this.db.execute({ sql: deleteWorld, args: [world, ns] });
  }
}

