import type { Client } from "@libsql/client";
import {
  deleteWorld,
  insertWorld,
  selectAllWorlds,
  selectWorldBySlug,
  selectWorldBySlugInternal,
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
   * get retrieves a world by its slug and namespace.
   * @param slug The world slug.
   * @param namespaceId The namespace ID.
   * @returns The world row or null if not found.
   */
  async get(slug: string, namespaceId: string): Promise<WorldRow | null> {
    const result = await this.db.execute({
      sql: selectWorldBySlug,
      args: [slug, namespaceId],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
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
   * getInternal retrieves a world by its slug without namespace scoping.
   * Use this ONLY for internal system operations.
   * @param slug The world slug.
   * @returns The world row or null if not found.
   */
  async getInternal(slug: string): Promise<WorldRow | null> {
    const result = await this.db.execute({
      sql: selectWorldBySlugInternal,
      args: [slug],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
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
   * @param namespaceId The namespace ID.
   * @param limit The maximum number of worlds to return.
   * @param offset The number of worlds to skip.
   * @returns An array of world rows.
   */
  async list(
    namespaceId: string,
    limit: number,
    offset: number,
  ): Promise<WorldRow[]> {
    const result = await this.db.execute({
      sql: selectAllWorlds,
      args: [namespaceId, limit, offset],
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
   * @param slug The slug of the world to update.
   * @param namespaceId The namespace ID.
   * @param updates The fields to update.
   */
  async update(
    slug: string,
    namespaceId: string,
    updates: WorldTableUpdate,
  ): Promise<void> {
    const row = await this.get(slug, namespaceId);
    if (!row) return;
    await this.db.execute({
      sql: updateWorld,
      args: [
        updates.label ?? row.label,
        updates.description ?? row.description,
        updates.updated_at ?? row.updated_at,
        updates.db_hostname ?? row.db_hostname,
        updates.db_token ?? row.db_token,
        updates.deleted_at ?? row.deleted_at,
        slug,
        namespaceId,
      ],
    });
  }

  /**
   * delete removes a world record by its slug and namespace.
   * @param slug The slug of the world to delete.
   * @param namespaceId The namespace ID.
   */
  async delete(slug: string, namespaceId: string): Promise<void> {
    await this.db.execute({ sql: deleteWorld, args: [slug, namespaceId] });
  }
}
