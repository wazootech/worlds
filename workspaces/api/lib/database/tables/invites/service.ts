import type { Client } from "@libsql/client";
import {
  deleteInvite,
  insertInvite,
  selectInviteByCode,
  selectInvites,
  updateInvite,
} from "./queries.sql.ts";
import type {
  InviteTable,
  InviteTableInsert,
  InviteTableUpdate,
} from "./schema.ts";

export class InvitesService {
  constructor(private readonly db: Client) {}

  async getMany(limit: number, offset: number): Promise<InviteTable[]> {
    const result = await this.db.execute({
      sql: selectInvites,
      args: [limit, offset],
    });
    return (result.rows as Record<string, unknown>[]).map((row) => ({
      code: row.code as string,
      created_at: row.created_at as number,
      redeemed_by: row.redeemed_by as string | null,
      redeemed_at: row.redeemed_at as number | null,
    }));
  }

  async add(invite: InviteTableInsert): Promise<void> {
    await this.db.execute({
      sql: insertInvite,
      args: [
        invite.code,
        invite.created_at,
        invite.redeemed_by,
        invite.redeemed_at,
      ],
    });
  }

  async find(code: string): Promise<InviteTable | null> {
    const result = await this.db.execute({
      sql: selectInviteByCode,
      args: [code],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      code: row.code as string,
      created_at: row.created_at as number,
      redeemed_by: row.redeemed_by as string | null,
      redeemed_at: row.redeemed_at as number | null,
    };
  }

  async update(code: string, updates: InviteTableUpdate): Promise<void> {
    await this.db.execute({
      sql: updateInvite,
      args: [updates.redeemed_by ?? null, updates.redeemed_at ?? null, code],
    });
  }

  async delete(code: string): Promise<void> {
    await this.db.execute({ sql: deleteInvite, args: [code] });
  }
}
