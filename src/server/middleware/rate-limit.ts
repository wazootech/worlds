import type { AppContext } from "#/server/app-context.ts";
import type { ResourceType } from "#/server/rate-limit/policies.ts";
import { getPolicy } from "#/server/rate-limit/policies.ts";
import { TokenBucketRateLimiter } from "#/server/rate-limit/rate-limiter.ts";
import { tenantsFind } from "#/server/db/queries/tenants.sql.ts";

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
  tenantId: string,
  worldId: string,
  options: RateLimitOptions,
): Promise<Record<string, string>> {
  const cost = options.cost ?? 1;

  // Get the tenant's plan
  const result = await appContext.libsqlClient.execute({
    sql: tenantsFind,
    args: [tenantId],
  });
  const tenant = result.rows[0];
  const planName = tenant?.plan as string | null || null;

  // Get the policy for this resource
  const policy = getPolicy(planName, options.resourceType);

  // Create rate limiter
  const rateLimiter = new TokenBucketRateLimiter(appContext.libsqlClient);

  // Create bucket key: tenantId:worldId:resourceType
  const key = `${tenantId}:${worldId}:${options.resourceType}`;

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
