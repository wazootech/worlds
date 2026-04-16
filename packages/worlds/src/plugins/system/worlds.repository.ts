import type { Client } from "@libsql/client";
import {
  deleteWorld,
  insertWorld,
  selectAllWorlds,
  selectWorldById,
  selectWorldByIdInternal,
  updateWorld,
} from "./registry.sql.ts";
import type {
  WorldRow,
  WorldRowInsert,
  WorldRowUpdate,
} from "./worlds.schema.ts";

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
   * @param id The world identifier.
   * @param namespace The namespace (optional - uses context default if null).
   * @returns The world row or null if not found.
   */
  async get(
    id?: string,
    namespace?: string,
  ): Promise<WorldRow | null> {
    const result = await this.db.execute({
      sql: selectWorldById,
      args: [id ?? null, namespace ?? null],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * getInternal retrieves a world by its identifier without namespace scoping.
   * Use this ONLY for internal system operations.
   * @param id The world identifier.
   * @returns The world row or null if not found.
   */
  async getInternal(id?: string): Promise<WorldRow | null> {
    const result = await this.db.execute({
      sql: selectWorldByIdInternal,
      args: [id ?? null],
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
      namespace: (row.namespace as string | null) ?? undefined,
      id: (row.id as string | null) ?? "",
      label: row.label as string,
      description: (row.description as string | null) ?? undefined,
      db_hostname: row.db_hostname as string | null,
      db_token: row.db_token as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      deleted_at: row.deleted_at as number | null,
    };
  }

  /**
   * list retrieves a paginated list of worlds for a specific namespace.
   * @param namespace The namespace (optional - if not provided, lists all worlds).
   * @param limit The maximum number of worlds to return.
   * @param offset The number of worlds to skip.
   * @returns An array of world rows.
   */
  async list(
    namespace: string | undefined,
    limit: number,
    offset: number,
  ): Promise<WorldRow[]> {
    const result = await this.db.execute({
      sql: selectAllWorlds,
      args: [namespace ?? null, limit, offset],
    });
    return (result.rows as Record<string, unknown>[]).map((row) =>
      this.mapRow(row)
    );
  }

  /**
   * insert creates a new world record.
   * @param world The world data to insert.
   */
  async insert(world: WorldRowInsert): Promise<void> {
    const ns = world.namespace;
    const w = world.id;
    await this.db.execute({
      sql: insertWorld,
      args: [
        ns ?? null,
        w ?? null,
        world.label,
        world.description ?? null,
        world.db_hostname ?? null,
        world.db_token ?? null,
        world.created_at,
        world.updated_at,
        world.deleted_at ?? null,
      ],
    });
  }

  /**
   * update modifies an existing world record.
   * @param id The world identifier.
   * @param namespace The namespace.
   * @param updates The fields to update.
   */
  async update(
    id: string | undefined,
    namespace: string | undefined,
    updates: WorldRowUpdate,
  ): Promise<void> {
    const row = await this.get(id, namespace);
    if (!row) return;
    await this.db.execute({
      sql: updateWorld,
      args: [
        updates.label ?? row.label,
        updates.description ?? row.description ?? null,
        updates.db_hostname ?? row.db_hostname,
        updates.db_token ?? row.db_token,
        updates.updated_at ?? row.updated_at,
        updates.deleted_at ?? row.deleted_at ?? null,
        id ?? null,
        namespace ?? null,
      ],
    });
  }

  /**
   * delete removes a world record by its identifier and namespace.
   * @param id The world identifier.
   * @param namespace The namespace (optional).
   */
  async delete(
    id?: string,
    namespace?: string,
  ): Promise<void> {
    await this.db.execute({
      sql: deleteWorld,
      args: [id ?? null, namespace ?? null],
    });
  }
}
