import { assertEquals } from "@std/assert";
import { TokenBucketRateLimiter } from "./rate-limiter.ts";
import type { RateLimitPolicy } from "./interfaces.ts";
import { createClient } from "@libsql/client";
import { initializeDatabase } from "#/server/db/init.ts";
import { createTestAccount } from "#/server/testing.ts";

/**
 * Creates an in-memory LibSQL client for testing.
 */
async function createTestClient() {
  const client = createClient({ url: ":memory:" });
  await initializeDatabase(client);
  return client;
}

Deno.test("TokenBucketRateLimiter - allows requests within capacity", async () => {
  const client = await createTestClient();
  const limiter = new TokenBucketRateLimiter(client);
  const { id: accountId } = await createTestAccount(client);

  const policy: RateLimitPolicy = {
    interval: 60000, // 1 minute
    capacity: 10,
    refillRate: 10,
  };

  const key = `${accountId}:world1:sparql_query`;

  // First request should succeed
  const result1 = await limiter.consume(key, 1, policy);
  assertEquals(result1.allowed, true);
  assertEquals(result1.remaining, 9);

  // Second request should succeed
  const result2 = await limiter.consume(key, 1, policy);
  assertEquals(result2.allowed, true);
  assertEquals(result2.remaining, 8);
});

Deno.test("TokenBucketRateLimiter - rejects requests exceeding capacity", async () => {
  const client = await createTestClient();
  const limiter = new TokenBucketRateLimiter(client);
  const { id: accountId } = await createTestAccount(client);

  // Very low limit for testing
  const policy: RateLimitPolicy = {
    interval: 60000,
    capacity: 3,
    refillRate: 3,
  };

  const key = `${accountId}:world2:sparql_query`;

  // Consume all tokens
  await limiter.consume(key, 1, policy);
  await limiter.consume(key, 1, policy);
  await limiter.consume(key, 1, policy);

  // Next request should be denied
  const result = await limiter.consume(key, 1, policy);
  assertEquals(result.allowed, false);
  assertEquals(result.remaining, 0);
});

Deno.test("TokenBucketRateLimiter - refills tokens over time", async () => {
  const client = await createTestClient();
  const limiter = new TokenBucketRateLimiter(client);
  const { id: accountId } = await createTestAccount(client);

  // Short interval for testing
  const policy: RateLimitPolicy = {
    interval: 100, // 100ms
    capacity: 5,
    refillRate: 5,
  };

  const key = `${accountId}:world3:sparql_query`;

  // Consume all tokens
  await limiter.consume(key, 5, policy);

  // Should be denied immediately
  const result1 = await limiter.consume(key, 1, policy);
  assertEquals(result1.allowed, false);

  // Wait for refill
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Should be allowed after refill
  const result2 = await limiter.consume(key, 1, policy);
  assertEquals(result2.allowed, true);
  assertEquals(result2.remaining, 4);
});

Deno.test("TokenBucketRateLimiter - doesn't exceed capacity on refill", async () => {
  const client = await createTestClient();
  const limiter = new TokenBucketRateLimiter(client);
  const { id: accountId } = await createTestAccount(client);

  const policy: RateLimitPolicy = {
    interval: 100,
    capacity: 5,
    refillRate: 5,
  };

  const key = `${accountId}:world4:sparql_query`;

  // Consume 2 tokens
  await limiter.consume(key, 2, policy);

  // Wait for multiple refill intervals
  await new Promise((resolve) => setTimeout(resolve, 250));

  // Should have full capacity, not more
  const result = await limiter.consume(key, 5, policy);
  assertEquals(result.allowed, true);
  assertEquals(result.remaining, 0);
});

Deno.test("TokenBucketRateLimiter - handles different resource types independently", async () => {
  const client = await createTestClient();
  const limiter = new TokenBucketRateLimiter(client);
  const { id: accountId } = await createTestAccount(client);

  const policy: RateLimitPolicy = {
    interval: 60000,
    capacity: 5,
    refillRate: 5,
  };

  const queryKey = `${accountId}:world5:sparql_query`;
  const updateKey = `${accountId}:world5:sparql_update`;

  // Consume all query tokens
  await limiter.consume(queryKey, 5, policy);
  const queryResult = await limiter.consume(queryKey, 1, policy);
  assertEquals(queryResult.allowed, false);

  // Update tokens should still be available
  const updateResult = await limiter.consume(updateKey, 1, policy);
  assertEquals(updateResult.allowed, true);
  assertEquals(updateResult.remaining, 4);
});

Deno.test("TokenBucketRateLimiter - handles cost greater than 1", async () => {
  const client = await createTestClient();
  const limiter = new TokenBucketRateLimiter(client);
  const { id: accountId } = await createTestAccount(client);

  const policy: RateLimitPolicy = {
    interval: 60000,
    capacity: 10,
    refillRate: 10,
  };

  const key = `${accountId}:world6:sparql_query`;

  // Consume 5 tokens at once
  const result1 = await limiter.consume(key, 5, policy);
  assertEquals(result1.allowed, true);
  assertEquals(result1.remaining, 5);

  // Try to consume 6 tokens (should fail)
  const result2 = await limiter.consume(key, 6, policy);
  assertEquals(result2.allowed, false);
  assertEquals(result2.remaining, 5);
});
