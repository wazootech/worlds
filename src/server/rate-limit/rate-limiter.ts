import type { Client } from "@libsql/client";
import type {
  RateLimiter,
  RateLimitPolicy,
  RateLimitResult,
} from "./interfaces.ts";
import {
  tokenBucketsFind,
  tokenBucketsUpsert,
} from "#/server/db/queries/token-buckets.sql.ts";
import { ulid } from "@std/ulid";

/**
 * TokenBucketRateLimiter implements the Token Bucket algorithm for rate limiting.
 */
export class TokenBucketRateLimiter implements RateLimiter {
  constructor(private client: Client) {}

  /**
   * consume attempts to consume tokens from a bucket.
   * Implements the Token Bucket algorithm with atomic operations using LibSQL transactions.
   */
  async consume(
    key: string,
    cost: number,
    policy: RateLimitPolicy,
  ): Promise<RateLimitResult> {
    // Retry loop for transaction conflicts
    const maxRetries = 10;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const now = Date.now();

        // Start a transaction for atomicity
        await this.client.execute("BEGIN IMMEDIATE TRANSACTION");

        try {
          // Try to get existing bucket
          const result = await this.client.execute({
            sql: tokenBucketsFind,
            args: [key],
          });
          const existing = result.rows[0];

          let tokens: number;
          let lastRefillAt: number;

          if (existing) {
            // Calculate tokens to add based on time elapsed
            const timeSinceRefill = now - (existing.last_refill_at as number);
            const intervalsElapsed = Math.floor(
              timeSinceRefill / policy.interval,
            );
            const tokensToAdd = intervalsElapsed * policy.refillRate;

            // Refill tokens, but don't exceed capacity
            tokens = Math.min(
              (existing.tokens as number) + tokensToAdd,
              policy.capacity,
            );
            lastRefillAt = (existing.last_refill_at as number) +
              (intervalsElapsed * policy.interval);
          } else {
            // New bucket starts at full capacity
            tokens = policy.capacity;
            lastRefillAt = now;
          }

          // Check if we have enough tokens
          const allowed = tokens >= cost;

          // Calculate reset time (when next token will be available)
          let reset: number;
          if (allowed) {
            tokens -= cost;
            reset = lastRefillAt + policy.interval;
          } else {
            const tokensNeeded = cost - tokens;
            const intervalsNeeded = Math.ceil(tokensNeeded / policy.refillRate);
            reset = lastRefillAt + (intervalsNeeded * policy.interval);
          }

          // Only update bucket if request is allowed
          if (allowed) {
            const accountId = key.split(":")[0]; // Extract accountId from key
            const id = existing?.id as string ?? ulid();

            await this.client.execute({
              sql: tokenBucketsUpsert,
              args: [id, accountId, key, tokens, lastRefillAt],
            });
          }

          // Commit the transaction
          await this.client.execute("COMMIT");

          return {
            allowed,
            remaining: Math.floor(tokens),
            reset,
          };
        } catch (error) {
          // Rollback on error
          await this.client.execute("ROLLBACK");
          throw error;
        }
      } catch (error) {
        // Check if it's a transaction conflict (SQLITE_BUSY)
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        if (errorMessage.includes("BUSY") || errorMessage.includes("LOCKED")) {
          // Retry on transaction conflict
          continue;
        }
        // Re-throw other errors
        throw error;
      }
    }

    // If we exhausted retries, throw an error
    throw new Error("Rate limit check failed after maximum retries");
  }
}
