import type { Client } from "#/core/database/database.ts";
import type { LimitsService } from "./service.ts";

import type { Limit } from "#/core/types/usage.ts";
import type { LimitRow } from "#/core/database/system.ts";

/**
 * SqliteLimitsService is the SQLite implementation of LimitsService.
 *
 * This implementation stores plan limits in the system database (`kb_limits` table).
 * Limits include:
 * - Request rate quotas (requests per minute)
 * - Storage quotas (bytes)
 * - Feature flags (e.g., allow_reasoning)
 *
 * Changes to limits take effect immediately for all accounts on that plan tier,
 * enabling dynamic plan upgrades without code deployment.
 */
export class SqliteLimitsService implements LimitsService {
  /**
   * Creates a new SqliteLimitsService instance.
   *
   * @param db - The SQLite database client (system database)
   */
  constructor(private readonly db: Client) {}

  async getLimits(plan: string): Promise<Limit | null> {
    const result = await this.db.execute({
      sql: "SELECT * FROM kb_limits WHERE plan = ?",
      args: [plan],
    });
    const row = result.rows[0] as unknown as LimitRow | undefined;

    if (!row) return null;

    return {
      plan: row.plan,
      quotaRequestsPerMin: row.quota_requests_per_min,
      quotaStorageBytes: row.quota_storage_bytes,
      allowReasoning: Boolean(row.allow_reasoning),
    };
  }

  async setLimits(limit: Limit): Promise<void> {
    await this.db.execute({
      sql: `
        INSERT INTO kb_limits (plan, quota_requests_per_min, quota_storage_bytes, allow_reasoning)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(plan) DO UPDATE SET
            quota_requests_per_min = excluded.quota_requests_per_min,
            quota_storage_bytes = excluded.quota_storage_bytes,
            allow_reasoning = excluded.allow_reasoning
        `,
      args: [
        limit.plan,
        limit.quotaRequestsPerMin,
        limit.quotaStorageBytes,
        limit.allowReasoning ? 1 : 0,
      ],
    });
  }
}
