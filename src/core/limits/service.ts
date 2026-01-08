import type { Limit } from "#/core/types/usage.ts";

/**
 * LimitsService manages plan-based limits and quotas.
 *
 * This service provides dynamic access control by allowing runtime configuration
 * of limits per plan tier. Limits can be updated without code deployment,
 * enabling instant plan upgrades and feature flagging.
 *
 * Limits typically include:
 * - Maximum number of worlds per account
 * - Maximum statements per world
 * - Rate limits (requests per minute)
 * - Feature flags (access to specific endpoints)
 */
export interface LimitsService {
  /**
   * getLimits retrieves the limits for a specific plan tier.
   *
   * @param plan - The plan identifier (e.g., "free", "pro")
   * @returns The limits for the plan, or null if the plan doesn't exist
   *
   * @example
   * ```ts
   * const limits = await limitsService.getLimits("pro");
   * // Returns: {
   * //   plan: "pro",
   * //   maxWorlds: 100,
   * //   maxStatementsPerWorld: 1000000,
   * //   requestsPerMinute: 1000,
   * //   features: ["reasoning", "vector_search"]
   * // }
   * ```
   */
  getLimits(plan: string): Promise<Limit | null>;

  /**
   * setLimits creates or updates the limits for a plan.
   *
   * Changes take effect immediately for all accounts on that plan tier.
   * This enables instant upgrades and dynamic feature flagging.
   *
   * @param limit - The limit configuration to set
   * @throws {Error} If the limit data is invalid or the operation fails
   *
   * @example
   * ```ts
   * await limitsService.setLimits({
   *   plan: "pro",
   *   maxWorlds: 200, // Increased from 100
   *   maxStatementsPerWorld: 2000000,
   *   requestsPerMinute: 2000,
   *   features: ["reasoning", "vector_search", "hybrid_search"]
   * });
   * ```
   */
  setLimits(limit: Limit): Promise<void>;
}
