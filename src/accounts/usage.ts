import type {
  AccountUsageEvent,
  AccountUsageSummary,
  WorldUsageSummary,
} from "#/accounts/accounts-service.ts";

/**
 * updateUsageSummary updates the usage summary for an account.
 */
export function updateUsageSummary(
  usageSummary: AccountUsageSummary,
  event: AccountUsageEvent,
): void {
  // Initialize world usage if it doesn't exist.
  if (event.params.worldId) {
    usageSummary.worlds[event.params.worldId] ??= emptyWorldUsageSummary(
      event.timestamp,
    );
    const worldUsageSummary = usageSummary.worlds[event.params.worldId];

    // Update the world's last updated timestamp.
    worldUsageSummary.updatedAt = event.timestamp;
  }

  // Update the world's usage.
  switch (event.endpoint) {
    case "GET /worlds/{worldId}": {
      usageSummary.worlds[event.params.worldId].reads++;
      break;
    }

    case "POST /worlds/{worldId}":
    case "PUT /worlds/{worldId}":
    case "DELETE /worlds/{worldId}": {
      usageSummary.worlds[event.params.worldId].writes++;
      break;
    }

    case "GET /worlds/{worldId}/sparql": {
      usageSummary.worlds[event.params.worldId].queries++;
      break;
    }

    case "POST /worlds/{worldId}/sparql": {
      usageSummary.worlds[event.params.worldId].updates++;
      break;
    }
  }
}

/**
 * emptyWorldUsageSummary creates an empty world usage summary.
 */
export function emptyWorldUsageSummary(timestamp: number): WorldUsageSummary {
  return {
    reads: 0,
    writes: 0,
    queries: 0,
    updates: 0,
    updatedAt: timestamp,
  };
}
