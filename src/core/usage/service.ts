import type { UsageBucket } from "#/core/types/usage.ts";

/**
 * UsageService records and manages usage events for billing and rate limiting.
 *
 * This service tracks API usage at a granular level, aggregating events into
 * time-bucketed summaries. Usage is tracked per account and can be used for:
 * - Pay-as-you-go billing
 * - Rate limiting and quota enforcement
 * - Analytics and monitoring
 *
 * Usage events are typically recorded asynchronously to minimize latency impact.
 */
export interface UsageService {
  /**
   * meter records a usage event and updates the account's usage summary.
   *
   * Events are aggregated into time buckets (e.g., 1-minute intervals) based on
   * the event timestamp. Multiple events in the same bucket are combined,
   * incrementing counters for requests, tokens, etc.
   *
   * @param event - The usage event to record
   * @throws {Error} If the event data is invalid or the operation fails
   *
   * @example
   * ```ts
   * await usageService.meter({
   *   id: crypto.randomUUID(),
   *   accountId: "acc_123",
   *   timestamp: Date.now(),
   *   endpoint: "POST /worlds/{worldId}",
   *   params: { worldId: "world_456" },
   *   statusCode: 200
   * });
   * ```
   */
  meter(event: AccountUsageEvent): Promise<void>;

  /**
   * getUsage retrieves the usage buckets for an account.
   *
   * Returns all usage buckets for the specified account, typically ordered
   * by time (most recent first). Each bucket represents aggregated usage
   * for a specific time period and endpoint.
   *
   * @param accountId - The unique account identifier
   * @returns An array of usage buckets, empty if no usage has been recorded
   *
   * @example
   * ```ts
   * const buckets = await usageService.getUsage("acc_123");
   * // Returns: [
   * //   {
   * //     bucketStartTs: 1234567890000,
   * //     accountId: "acc_123",
   * //     endpoint: "POST /worlds/world_456",
   * //     requestCount: 42,
   * //     tokenInCount: 1000,
   * //     tokenOutCount: 2000
   * //   },
   * //   ...
   * // ]
   * ```
   */
  getUsage(accountId: string): Promise<UsageBucket[]>;
}

/**
 * AccountUsageEvent is a log entry for an event associated with an account.
 */
export interface AccountUsageEvent {
  /**
   * id is the unique ID of the event.
   */
  id: string;

  /**
   * accountId is the ID of the account associated with the event.
   */
  accountId: string;

  /**
   * timestamp is the Unix timestamp in milliseconds of the event.
   */
  timestamp: number;

  /**
   * endpoint is the method and pathname the event occurred on.
   */
  endpoint: AccountUsageEventEndpoint;

  /**
   * params is the parameters associated with the event.
   */
  params: Record<string, string>;

  /**
   * statusCode is the HTTP status code of the event.
   */
  statusCode: number;
}

/**
 * AccountUsageEventEndpoint is a valid HTTP method and pathname.
 */
export type AccountUsageEventEndpoint =
  | "GET /worlds/{worldId}"
  | "POST /worlds/{worldId}"
  | "PUT /worlds/{worldId}"
  | "PATCH /worlds/{worldId}"
  | "DELETE /worlds/{worldId}"
  | "GET /worlds/{worldId}/sparql"
  | "POST /worlds/{worldId}/sparql";
