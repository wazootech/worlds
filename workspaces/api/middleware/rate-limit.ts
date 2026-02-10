import type { AppContext } from "#/context.ts";
import type { AuthorizedRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { RateLimitsService } from "#/lib/database/tables/rate-limits/service.ts";

/**
 * PERIOD_MS is the period for token bucket (ms). Policy: 60_000 = 1 minute.
 */
const PERIOD_MS = 60_000;

/**
 * POLICY_LIMITS maps feature_id to max requests per minute. Derived from docs/policy.md.
 */
export const POLICY_LIMITS = {
  organizations_list: 120,
  organizations_create: 20,
  organizations_get: 120,
  organizations_update: 30,
  organizations_delete: 20,
  invites_list: 120,
  invites_create: 30,
  invites_get: 120,
  invites_delete: 30,
  worlds_list: 120,
  worlds_get: 120,
  worlds_create: 20,
  worlds_update: 30,
  worlds_delete: 20,
  worlds_export: 60,
  worlds_import: 30,
  sparql_describe: 60,
  sparql_query: 60,
  sparql_update: 30,
  semantic_search: 30,
  service_accounts_list: 120,
  service_accounts_create: 20,
  service_accounts_get: 120,
  service_accounts_update: 30,
  service_accounts_delete: 20,
  logs_list: 120,
  metrics_query: 120,
} as const;

/**
 * checkRateLimit enforces per-service-account rate limits. Admin is exempt.
 * Returns a Response to return (429 or 401) or null to proceed.
 */
export async function checkRateLimit(
  appContext: AppContext,
  authorized: AuthorizedRequest,
  featureId: keyof typeof POLICY_LIMITS,
): Promise<Response | null> {
  if (authorized.admin) {
    return null;
  }
  if (!authorized.serviceAccountId) {
    return ErrorResponse.Unauthorized();
  }

  const limit = POLICY_LIMITS[featureId];
  if (limit == null) {
    return null;
  }

  const key = `${authorized.serviceAccountId}:${featureId}`;
  const rateLimitsService = new RateLimitsService(appContext.database);
  const result = await rateLimitsService.checkLimit(key, limit, PERIOD_MS);
  if (!result.allowed) {
    return ErrorResponse.RateLimitExceeded("Rate limit exceeded", {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(result.reset / 1000).toString(),
    });
  }

  return null;
}
