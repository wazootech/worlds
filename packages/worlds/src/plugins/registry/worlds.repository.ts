import type { Client } from "@libsql/client";
import {
  deleteWorld,
  insertWorld,
  selectAllWorlds,
  selectWorldBySlug,
  selectWorldBySlugInternal,
  updateWorld,
} from "./registry.sql.ts";
import type {
  WorldRow,
  WorldTableInsert,
  WorldTableUpdate,
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
   * @param slug The world identifier.
   * @param namespace The namespace (optional - defaults to "_" if not provided).
   * @returns The world row or null if not found.
   */
  async get(
    slug: string | null,
    namespace?: string | null,
  ): Promise<WorldRow | null> {
    const s = slug ?? "_";
    const ns = namespace ?? "_";
    const result = await this.db.execute({
      sql: selectWorldBySlug,
      args: [s, ns],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * getInternal retrieves a world by its identifier without namespace scoping.
   * Use this ONLY for internal system operations.
   * @param slug The world identifier.
   * @returns The world row or null if not found.
   */
  async getInternal(slug: string | null): Promise<WorldRow | null> {
    const s = slug ?? "_";
    const result = await this.db.execute({
      sql: selectWorldBySlugInternal,
      args: [s],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * mapRow maps a database row to a WorldRow.
   */
  private mapRow(row: Record<string, unknown>): WorldRow {
    const ns = row.namespace as string;
    const slug = row.slug as string;
    return {
      namespace: ns,
      slug: slug,
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
   * @param namespace The namespace (optional - if not provided, lists all worlds).
   * @param limit The maximum number of worlds to return.
   * @param offset The number of worlds to skip.
   * @returns An array of world rows.
   */
  async list(
    namespace: string | null | undefined,
    limit: number,
    offset: number,
  ): Promise<WorldRow[]> {
    const ns = namespace ?? "_";
    const result = (ns !== "-")
      ? await this.db.execute({
        sql: selectAllWorlds,
        args: [ns, limit, offset],
      })
      : await this.db.execute({
        sql: `SELECT * FROM worlds ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        args: [limit, offset],
      });
    return (result.rows as Record<string, unknown>[]).map((row) =>
      this.mapRow(row)
    );
  }

  /**
   * insert creates a new world record.
   * @param world The world data to insert.
   */
  async insert(world: WorldTableInsert): Promise<void> {
    const ns = world.namespace;
    const slug = world.slug;
    await this.db.execute({
      sql: insertWorld,
      args: [
        ns,
        slug,
        world.label,
        world.description,
        world.db_hostname ?? null,
        world.db_token ?? null,
        world.created_at,
        world.updated_at,
        world.deleted_at,
      ],
    });
  }

  /**
   * update modifies an existing world record.
   * @param slug The world identifier.
   * @param namespace The namespace.
   * @param updates The fields to update.
   */
  async update(
    slug: string | null,
    namespace: string | null | undefined,
    updates: WorldTableUpdate,
  ): Promise<void> {
    const row = await this.get(slug, namespace);
    if (!row) return;
    const s = slug ?? "_";
    const ns = namespace ?? "_";
    await this.db.execute({
      sql: updateWorld,
      args: [
        updates.label ?? row.label,
        updates.description ?? row.description,
        updates.db_hostname ?? row.db_hostname,
        updates.db_token ?? row.db_token,
        updates.updated_at ?? row.updated_at,
        updates.deleted_at ?? row.deleted_at,
        s,
        ns,
      ],
    });
  }

  /**
   * delete removes a world record by its identifier and namespace.
   * @param slug The world identifier.
   * @param namespace The namespace (optional).
   */
  async delete(
    slug: string | null,
    namespace: string | null | undefined,
  ): Promise<void> {
    const s = slug ?? "_";
    const ns = namespace ?? "_";
    await this.db.execute({ sql: deleteWorld, args: [s, ns] });
  }
}