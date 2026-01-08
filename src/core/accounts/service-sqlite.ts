import type { Client } from "#/core/database/database.ts";
import type {
  Account,
  AccountPlan,
  AccountsService,
} from "#/core/accounts/service.ts";
import type { AccountRow, ApiKeyRow } from "#/core/database/system.ts";

/**
 * SqliteAccountsService is the SQLite implementation of AccountsService.
 *
 * This implementation stores accounts and API keys in the system database:
 * - `kb_accounts`: Account metadata (ID, description, plan, timestamps)
 * - `kb_api_keys`: API key hashes and prefixes for authentication
 * - `kb_world_access`: Many-to-many relationship between accounts and worlds
 *
 * API keys are stored as full hashes for security, with prefixes for quick lookup.
 * The service uses transactions to ensure atomicity of multi-table operations.
 */
export class SqliteAccountsService implements AccountsService {
  /**
   * Creates a new SqliteAccountsService instance.
   *
   * @param db - The SQLite database client (system database)
   */
  constructor(private readonly db: Client) {}

  async set(account: Account): Promise<void> {
    const existing = await this.get(account.id);

    // Upsert Account
    await this.db.execute({
      sql: `
        INSERT INTO kb_accounts (account_id, description, plan, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          description = excluded.description,
          plan = excluded.plan,
          updated_at = excluded.updated_at
      `,
      args: [
        account.id,
        account.description,
        account.plan,
        existing ? 0 : Date.now(), // Ignored by ON CONFLICT if updating, but needed for INSERT
        Date.now(),
      ],
    });

    const keyPrefix = account.apiKey.substring(0, 8);
    await this.db.execute({
      sql: `
        INSERT OR REPLACE INTO kb_api_keys (key_hash, account_id, key_prefix, created_at)
        VALUES (?, ?, ?, ?)
      `,
      args: [
        account.apiKey,
        account.id,
        keyPrefix,
        Date.now(),
      ],
    });
  }

  async get(id: string): Promise<Account | null> {
    const accountResult = await this.db.execute({
      sql: "SELECT * FROM kb_accounts WHERE account_id = ?",
      args: [id],
    });
    const accountRow = accountResult.rows[0] as unknown as
      | AccountRow
      | undefined;

    if (!accountRow) return null;

    const apiKeyResult = await this.db.execute({
      sql: "SELECT * FROM kb_api_keys WHERE account_id = ?",
      args: [id],
    });
    const apiKeyRow = apiKeyResult.rows[0] as unknown as ApiKeyRow | undefined;

    const worldsResult = await this.db.execute({
      sql: "SELECT world_id FROM kb_worlds WHERE account_id = ?",
      args: [id],
    });
    const worlds = worldsResult.rows as unknown as { world_id: string }[];

    const account: Account = {
      id: accountRow.account_id,
      apiKey: apiKeyRow?.key_hash ?? "",
      description: accountRow.description ?? "",
      plan: accountRow.plan as AccountPlan,
      accessControl: {
        worlds: worlds.map((w) => w.world_id),
      },
    };

    return account;
  }

  async getByApiKey(apiKey: string): Promise<Account | null> {
    const result = await this.db.execute({
      sql: "SELECT account_id FROM kb_api_keys WHERE key_hash = ?",
      args: [apiKey],
    });
    const keyRow = result.rows[0] as unknown as
      | { account_id: string }
      | undefined;

    if (!keyRow) return null;
    return this.get(keyRow.account_id);
  }

  async remove(id: string): Promise<void> {
    await this.db.execute({
      sql: "DELETE FROM kb_accounts WHERE account_id = ?",
      args: [id],
    });
  }

  async listAccounts(): Promise<Account[]> {
    const result = await this.db.execute("SELECT account_id FROM kb_accounts");
    const rows = result.rows as unknown as { account_id: string }[];

    // We can run these in parallel
    return Promise.all(
      rows.map((r) => this.get(r.account_id) as Promise<Account>),
    );
  }

  async addWorldAccess(accountId: string, worldId: string): Promise<void> {
    await this.db.execute({
      sql: `
        INSERT INTO kb_worlds (world_id, account_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(world_id) DO UPDATE SET account_id = excluded.account_id
      `,
      args: [worldId, accountId, "World " + worldId, Date.now(), Date.now()],
    });
  }

  async removeWorldAccess(accountId: string, worldId: string): Promise<void> {
    await this.db.execute({
      sql: "DELETE FROM kb_worlds WHERE world_id = ? AND account_id = ?",
      args: [worldId, accountId],
    });
  }
}
