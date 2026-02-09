import type { Client } from "@libsql/client";
import {
  deleteOrganization,
  insertOrganization,
  selectOrganizationById,
  selectOrganizations,
  updateOrganization,
} from "./queries.sql.ts";
import type {
  OrganizationRow,
  OrganizationTableInsert,
  OrganizationTableUpdate,
} from "./schema.ts";

export class OrganizationsService {
  constructor(private readonly db: Client) {}

  async getMany(limit: number, offset: number): Promise<OrganizationRow[]> {
    const result = await this.db.execute({
      sql: selectOrganizations,
      args: [limit, offset],
    });
    return (result.rows as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      label: row.label as string | null,
      description: row.description as string | null,
      plan: row.plan as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      deleted_at: row.deleted_at as number | null,
    }));
  }

  async add(organization: OrganizationTableInsert): Promise<void> {
    await this.db.execute({
      sql: insertOrganization,
      args: [
        organization.id,
        organization.label,
        organization.description,
        organization.plan,
        organization.created_at,
        organization.updated_at,
        organization.deleted_at,
      ],
    });
  }

  async find(id: string): Promise<OrganizationRow | null> {
    const result = await this.db.execute({
      sql: selectOrganizationById,
      args: [id],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      label: row.label as string | null,
      description: row.description as string | null,
      plan: row.plan as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      deleted_at: row.deleted_at as number | null,
    };
  }

  async update(
    id: string,
    updates: OrganizationTableUpdate,
  ): Promise<void> {
    await this.db.execute({
      sql: updateOrganization,
      args: [
        updates.label ?? null,
        updates.description ?? null,
        updates.plan ?? null,
        updates.updated_at ?? Date.now(),
        id,
      ],
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.execute({ sql: deleteOrganization, args: [id] });
  }
}
