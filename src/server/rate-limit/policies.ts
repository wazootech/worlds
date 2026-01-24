import type { RateLimitPolicy } from "./interfaces.ts";

/**
 * ResourceType defines the types of resources that can be rate limited.
 */
export type ResourceType = "sparql_query" | "sparql_update" | "search";

/**
 * PlanPolicy defines the limits for a specific tier.
 */
export interface PlanPolicy {
  rateLimits: Record<ResourceType, RateLimitPolicy>;
  worldLimits: {
    /**
     * maxWorlds is the maximum number of worlds an account can have.
     */
    maxWorlds: number;
    /**
     * maxWorldSize is the maximum size of a world blob in bytes.
     */
    maxWorldSize: number;
  };
}

/**
 * Policies defines the rate limit policies for different tiers.
 */
export const Policies: Record<string, PlanPolicy> = {
  free: {
    rateLimits: {
      sparql_query: {
        interval: 60 * 1000, // 1 minute
        capacity: 60,
        refillRate: 60,
      },
      sparql_update: {
        interval: 60 * 1000, // 1 minute
        capacity: 10,
        refillRate: 10,
      },
      search: {
        interval: 60 * 1000, // 1 minute
        capacity: 60,
        refillRate: 60,
      },
    },
    worldLimits: {
      maxWorlds: 3,
      maxWorldSize: 10 * 1024 * 1024, // 10MB
    },
  },
  pro: {
    rateLimits: {
      sparql_query: {
        interval: 60 * 1000,
        capacity: 1000,
        refillRate: 1000,
      },
      sparql_update: {
        interval: 60 * 1000,
        capacity: 100,
        refillRate: 100,
      },
      search: {
        interval: 60 * 1000,
        capacity: 1000,
        refillRate: 1000,
      },
    },
    worldLimits: {
      maxWorlds: 100,
      maxWorldSize: 1024 * 1024 * 1024, // 1GB
    },
  },
  test: {
    rateLimits: {
      sparql_query: {
        interval: 60 * 1000,
        capacity: 100,
        refillRate: 100,
      },
      sparql_update: {
        interval: 60 * 1000,
        capacity: 100,
        refillRate: 100,
      },
      search: {
        interval: 60 * 1000,
        capacity: 100,
        refillRate: 100,
      },
    },
    worldLimits: {
      maxWorlds: 2,
      maxWorldSize: 100, // 100 bytes
    },
  },
};

/**
 * DefaultPolicy is the fallback policy if no plan is found.
 */
export const DefaultPolicy = Policies.free;

/**
 * getPlanPolicy returns the policy for a given plan.
 */
export function getPlanPolicy(planName: string | null): PlanPolicy {
  return Policies[planName || "free"] || DefaultPolicy;
}

/**
 * getPolicy returns the rate limit policy for a given plan and resource.
 */
export function getPolicy(
  planName: string | null,
  resource: ResourceType,
): RateLimitPolicy {
  const policy = getPlanPolicy(planName);
  return policy.rateLimits[resource] || DefaultPolicy.rateLimits[resource];
}
