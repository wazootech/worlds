import type {
  Account,
  AccountsService,
  AccountUsageEvent,
  AccountUsageSummary,
} from "#/accounts/accounts-service.ts";
import { updateUsageSummary } from "#/accounts/usage.ts";

/**
 * DenoKvAccountsService implements AccountsService using `Deno.Kv`.
 */
export class DenoKvAccountsService implements AccountsService {
  public constructor(
    private readonly kv: Deno.Kv,
    private readonly prefix: Deno.KvKey = ["accounts"],
  ) {}

  private accountKey(accountId: Deno.KvKeyPart): Deno.KvKey {
    return [...this.prefix, accountId];
  }

  private eventKey(
    accountId: Deno.KvKeyPart,
    eventId: Deno.KvKeyPart,
  ): Deno.KvKey {
    return [...this.prefix, accountId, "events", eventId];
  }

  private usageSummaryKey(accountId: Deno.KvKeyPart): Deno.KvKey {
    return [...this.prefix, accountId, "usage_summary"];
  }

  private apiKeyKey(apiKey: string): Deno.KvKey {
    return ["api_keys", apiKey];
  }

  public async get(id: string): Promise<Account | null> {
    const result = await this.kv.get<Account>(this.accountKey(id));
    return result.value;
  }

  public async getByApiKey(apiKey: string): Promise<Account | null> {
    const accountIdResult = await this.kv.get<string>(this.apiKeyKey(apiKey));
    if (!accountIdResult.value) {
      return null;
    }

    return await this.get(accountIdResult.value);
  }

  public async set(account: Account): Promise<void> {
    const primaryKey = this.accountKey(account.id);
    const secondaryKey = this.apiKeyKey(account.apiKey);

    const atomic = this.kv.atomic()
      .set(primaryKey, account)
      .set(secondaryKey, account.id);

    const commitResult = await atomic.commit();
    if (!commitResult.ok) {
      throw new Error("Failed to set account");
    }
  }

  public async remove(id: string): Promise<void> {
    const account = await this.get(id);
    if (!account) {
      return;
    }

    const atomic = this.kv.atomic()
      .delete(this.accountKey(id))
      .delete(this.apiKeyKey(account.apiKey));

    await atomic.commit();
  }

  public async meter(event: AccountUsageEvent): Promise<void> {
    const usageSummaryResult = await this.kv.get<AccountUsageSummary>(
      this.usageSummaryKey(event.accountId),
    );
    const usageSummary: AccountUsageSummary = usageSummaryResult.value ??
      { worlds: {} };
    updateUsageSummary(usageSummary, event);

    const commitResult = await this.kv.atomic()
      .set(this.eventKey(event.accountId, event.id), event)
      .set(this.usageSummaryKey(event.accountId), usageSummary)
      .check(usageSummaryResult)
      .commit();
    if (!commitResult.ok) {
      throw new Error("Failed to store usage event");
    }
  }

  public async getUsageSummary(
    accountId: string,
  ): Promise<AccountUsageSummary | null> {
    const result = await this.kv.get<AccountUsageSummary>(
      this.usageSummaryKey(accountId),
    );
    return result.value;
  }

  public async listAccounts(): Promise<Account[]> {
    const accounts: Account[] = [];
    const iter = this.kv.list<Account>({ prefix: this.prefix });

    for await (const entry of iter) {
      // Only include entries that are accounts (not events or usage summaries)
      if (entry.key.length === this.prefix.length + 1 && entry.value) {
        accounts.push(entry.value);
      }
    }

    return accounts;
  }

  public async addWorldAccess(
    accountId: string,
    worldId: string,
  ): Promise<void> {
    const key = this.accountKey(accountId);
    let attempts = 0;
    while (attempts < 10) {
      const entry = await this.kv.get<Account>(key);
      if (!entry.value) {
        throw new Error("Account not found");
      }
      const account = entry.value;
      if (account.accessControl.worlds.includes(worldId)) {
        return;
      }

      account.accessControl.worlds.push(worldId);

      const res = await this.kv.atomic()
        .check(entry)
        .set(key, account)
        .commit();

      if (res.ok) return;
      attempts++;
    }
    throw new Error("Failed to add world access (concurrency limit reached)");
  }

  public async removeWorldAccess(
    accountId: string,
    worldId: string,
  ): Promise<void> {
    const key = this.accountKey(accountId);
    let attempts = 0;
    while (attempts < 10) {
      const entry = await this.kv.get<Account>(key);
      if (!entry.value) {
        throw new Error("Account not found");
      }
      const account = entry.value;
      if (!account.accessControl.worlds.includes(worldId)) {
        return;
      }

      account.accessControl.worlds = account.accessControl.worlds.filter(
        (id) => id !== worldId,
      );

      const res = await this.kv.atomic()
        .check(entry)
        .set(key, account)
        .commit();

      if (res.ok) return;
      attempts++;
    }
    throw new Error(
      "Failed to remove world access (concurrency limit reached)",
    );
  }
}
