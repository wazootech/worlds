import type { Client } from "@libsql/client";
import {
  serviceAccountsAdd,
  serviceAccountsGetByApiKey,
  serviceAccountsGetById,
  serviceAccountsListByOrganizationId,
  serviceAccountsRemove,
  serviceAccountsUpdate,
} from "./queries.sql.ts";
import type {
  ServiceAccountTable,
  ServiceAccountTableInsert,
  ServiceAccountTableUpdate,
} from "./schema.ts";

export class ServiceAccountsService {
  constructor(private readonly db: Client) {}

  async add(account: ServiceAccountTableInsert): Promise<void> {
    await this.db.execute({
      sql: serviceAccountsAdd,
      args: [
        account.id,
        account.organization_id,
        account.api_key,
        account.label,
        account.description,
        account.created_at,
        account.updated_at,
      ],
    });
  }

  async getById(id: string): Promise<ServiceAccountTable | null> {
    const result = await this.db.execute({
      sql: serviceAccountsGetById,
      args: [id],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      organization_id: row.organization_id as string,
      api_key: row.api_key as string,
      label: row.label as string | null,
      description: row.description as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    };
  }

  async getByApiKey(apiKey: string): Promise<ServiceAccountTable | null> {
    const result = await this.db.execute({
      sql: serviceAccountsGetByApiKey,
      args: [apiKey],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      organization_id: row.organization_id as string,
      api_key: row.api_key as string,
      label: row.label as string | null,
      description: row.description as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    };
  }

  async listByOrganizationId(
    organizationId: string,
  ): Promise<ServiceAccountTable[]> {
    const result = await this.db.execute({
      sql: serviceAccountsListByOrganizationId,
      args: [organizationId],
    });
    return (result.rows as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      organization_id: row.organization_id as string,
      api_key: row.api_key as string,
      label: row.label as string | null,
      description: row.description as string | null,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  }

  async update(id: string, updates: ServiceAccountTableUpdate): Promise<void> {
    await this.db.execute({
      sql: serviceAccountsUpdate,
      args: [
        updates.label ?? null,
        updates.description ?? null,
        updates.updated_at ?? Date.now(),
        id,
      ],
    });
  }

  async remove(id: string): Promise<void> {
    await this.db.execute({ sql: serviceAccountsRemove, args: [id] });
  }
}
