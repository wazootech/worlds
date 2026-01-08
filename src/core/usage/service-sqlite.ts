import type { Client } from "#/core/database/database.ts";
import type { AccountUsageEvent, UsageService } from "./service.ts";
import type { UsageBucket } from "#/core/types/usage.ts";
import type { UsageBucketRow } from "#/core/database/system.ts";

/**
 * SqliteUsageService is the SQLite implementation of UsageService.
 *
 * This implementation stores usage events in the system database (`kb_usage` table),
 * aggregating them into time-bucketed summaries. Events are grouped by:
 * - Time bucket (currently using bucket_start_ts = 0, should be updated to use actual time buckets)
 * - Account ID
 * - Endpoint (method and pathname)
 *
 * The service uses INSERT ... ON CONFLICT DO UPDATE to atomically increment counters,
 * ensuring thread-safe concurrent usage tracking.
 */
export class SqliteUsageService implements UsageService {
  /**
   * Creates a new SqliteUsageService instance.
   *
   * @param db - The SQLite database client (system database)
   */
  constructor(private readonly db: Client) {}

  async meter(event: AccountUsageEvent): Promise<void> {
    const bucketStartTs = 0;
    let formattedEndpoint = event.endpoint as string;
    for (const [key, value] of Object.entries(event.params)) {
      formattedEndpoint = formattedEndpoint.replace(`{${key}}`, value);
    }

    await this.db.execute({
      sql: `
        INSERT INTO kb_usage (bucket_start_ts, account_id, endpoint, request_count, token_in_count, token_out_count)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(bucket_start_ts, account_id, endpoint) DO UPDATE SET
          request_count = request_count + 1,
          token_in_count = token_in_count + excluded.token_in_count,
          token_out_count = token_out_count + excluded.token_out_count
      `,
      args: [bucketStartTs, event.accountId, formattedEndpoint, 1, 0, 0],
    });
  }

  async getUsage(accountId: string): Promise<UsageBucket[]> {
    const result = await this.db.execute({
      sql: "SELECT * FROM kb_usage WHERE account_id = ?",
      args: [accountId],
    });
    const rows = result.rows as unknown as UsageBucketRow[];

    return rows.map((row) => ({
      bucketStartTs: row.bucket_start_ts,
      accountId: row.account_id,
      endpoint: row.endpoint,
      requestCount: row.request_count,
      tokenInCount: row.token_in_count,
      tokenOutCount: row.token_out_count,
    }));
  }
}
