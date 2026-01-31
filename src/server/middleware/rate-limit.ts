import type { AppContext } from "#/server/app-context.ts";
import type { ResourceType } from "#/server/rate-limit/policies.ts";
import { getPolicy } from "#/server/rate-limit/policies.ts";
import { TokenBucketRateLimiter } from "#/server/rate-limit/rate-limiter.ts";
import { accountsFind } from "#/server/db/queries/accounts.sql.ts";

/**
 * RateLimitOptions configures the rate limit middleware.
 */
export interface RateLimitOptions {
  resourceType: ResourceType;
  cost?: number;
}

/**
 * checkRateLimit checks if a request should be rate limited.
 * Returns headers to add to the response and throws if rate limit exceeded.
 */
export async function checkRateLimit(
  appContext: AppContext,
  accountId: string,
  worldId: string,
  options: RateLimitOptions,
): Promise<Record<string, string>> {
  const cost = options.cost ?? 1;

  // Get the account's plan
  const result = await appContext.libsqlClient.execute({
    sql: accountsFind,
    args: [accountId],
  });
  const account = result.rows[0];
  const planName = account?.plan as string | null || null;

  // Get the policy for this resource
  const policy = getPolicy(planName, options.resourceType);

  // Create rate limiter
  const rateLimiter = new TokenBucketRateLimiter(appContext.libsqlClient);

  // Create bucket key: accountId:worldId:resourceType
  const key = `${accountId}:${worldId}:${options.resourceType}`;

  // Attempt to consume tokens
  const rateLimitResult = await rateLimiter.consume(key, cost, policy);

  // Prepare headers
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": policy.capacity.toString(),
    "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
    "X-RateLimit-Reset": rateLimitResult.reset.toString(),
  };

  // If not allowed, throw 429
  if (!rateLimitResult.allowed) {
    throw new Response("Too Many Requests", {
      status: 429,
      headers: {
        ...headers,
        "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
          .toString(),
      },
    });
  }

  return headers;
}
