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

  public async get(id: string): Promise<Account | null> {
    const result = await this.kv.get<Account>(this.accountKey(id));
    return result.value;
  }

  public async set(account: Account): Promise<void> {
    await this.kv.set(this.accountKey(account.id), account);
  }

  public async remove(id: string): Promise<void> {
    await this.kv.delete(this.accountKey(id));
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
}
