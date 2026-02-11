import type { Client } from "@libsql/client";
import {
  deleteWorld,
  insertWorld,
  selectWorldById,
  selectWorldsByOrganizationId,
  updateWorld,
} from "./queries.sql.ts";
import type { WorldRow, WorldTableInsert, WorldTableUpdate } from "./schema.ts";

export class WorldsService {
  constructor(private readonly db: Client) {}

  async getById(id: string): Promise<WorldRow | null> {
    const result = await this.db.execute({
      sql: selectWorldById,
      args: [id],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      organization_id: row.organization_id as string,
      label: row.label as string,
      description: row.description as string | null,
      db_hostname: row.db_hostname as string | null,
      db_token: row.db_token as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      deleted_at: row.deleted_at as number | null,
    };
  }

  async getByOrganizationId(
    organizationId: string,
    limit: number,
    offset: number,
  ): Promise<WorldRow[]> {
    const result = await this.db.execute({
      sql: selectWorldsByOrganizationId,
      args: [organizationId, limit, offset],
    });
    return (result.rows as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      organization_id: row.organization_id as string,
      label: row.label as string,
      description: row.description as string | null,
      db_hostname: row.db_hostname as string | null,
      db_token: row.db_token as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      deleted_at: row.deleted_at as number | null,
    }));
  }

  async insert(world: WorldTableInsert): Promise<void> {
    await this.db.execute({
      sql: insertWorld,
      args: [
        world.id,
        world.organization_id,
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

  async update(id: string, updates: WorldTableUpdate): Promise<void> {
    const row = await this.getById(id);
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
        id,
      ],
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.execute({ sql: deleteWorld, args: [id] });
  }
}
