import type { Client } from "@libsql/client";
import {
  insertRateLimit,
  selectRateLimitByKey,
  updateRateLimit,
} from "./queries.sql.ts";
import type { RateLimit } from "./schema.ts";

/**
 * RateLimitsService checks and consumes rate limit tokens using a token bucket.
 * Key format: {identity}:{feature_id} (e.g. service_account_id:worlds_list).
 */
export interface CheckLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export class RateLimitsService {
  constructor(private readonly db: Client) {}

  async checkLimit(
    key: string,
    limit: number,
    period: number,
  ): Promise<CheckLimitResult> {
    const now = Date.now();
    const limitNum = Math.max(1, limit);
    const periodMs = Math.max(1000, period);

    const selectResult = await this.db.execute({
      sql: selectRateLimitByKey,
      args: [key],
    });
    const row = selectResult.rows[0] as unknown as RateLimit | undefined;

    let tokens: number;
    let lastRefill: number;

    if (row) {
      const elapsed = (now - row.last_refill) / 1000; // seconds
      const refillRate = limitNum / (periodMs / 1000);
      tokens = Math.min(limitNum, row.tokens + elapsed * refillRate);
      lastRefill = row.last_refill;
    } else {
      tokens = limitNum;
      lastRefill = now;
    }

    const reset = lastRefill + periodMs;
    const remainingBefore = Math.floor(tokens);

    if (tokens >= 1) {
      const newTokens = tokens - 1;
      if (row) {
        await this.db.execute({
          sql: updateRateLimit,
          args: [newTokens, now, key],
        });
      } else {
        await this.db.execute({
          sql: insertRateLimit,
          args: [key, newTokens, now],
        });
      }
      return {
        allowed: true,
        remaining: Math.max(0, remainingBefore - 1),
        reset: now + periodMs,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      reset,
    };
  }
}
