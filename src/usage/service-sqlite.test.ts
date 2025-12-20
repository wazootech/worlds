import { assert, assertEquals } from "@std/assert";
import { type AppContext, sqliteAppContext } from "#/server/app-context.ts";
import type {
  AccountUsageEvent,
  AccountUsageEventEndpoint,
} from "#/usage/service.ts";
import { ulid } from "@std/ulid";
import type { Account } from "#/accounts/service.ts";

async function setup(context: AppContext, accountId: string) {
  await context.accountsService.set({
    id: accountId,
    apiKey: "sk_" + accountId,
    description: "Test Account",
    plan: "free",
    accessControl: { worlds: [] },
  } as Account);
}

Deno.test("SqliteUsageService: Meter and Get Usage", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.usageService;
  const accountId = "test-account-usage";
  await setup(context, accountId);
  const endpoint: AccountUsageEventEndpoint = "GET /worlds/{worldId}";

  const event: AccountUsageEvent = {
    id: ulid(),
    accountId,
    endpoint,
    params: { worldId: "123" },
    timestamp: Date.now(),
    statusCode: 200,
  };

  await service.meter(event);

  const usage = await service.getUsage(accountId);
  assertEquals(usage.length, 1);
  assertEquals(usage[0].accountId, accountId);
  // The service replaces params in the endpoint string
  assertEquals(usage[0].endpoint, "GET /worlds/123");
  assertEquals(usage[0].requestCount, 1);
});

Deno.test("SqliteUsageService: Multiple Metering Events Aggregate", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.usageService;
  const accountId = "test-account-agg";
  await setup(context, accountId);
  const endpoint: AccountUsageEventEndpoint = "POST /worlds/{worldId}";

  const baseEvent = {
    endpoint,
    params: { worldId: "abc" },
    statusCode: 201,
  };

  await service.meter({
    ...baseEvent,
    id: ulid(),
    accountId,
    timestamp: Date.now(),
  });
  await service.meter({
    ...baseEvent,
    id: ulid(),
    accountId,
    timestamp: Date.now(),
  });
  await service.meter({
    ...baseEvent,
    id: ulid(),
    accountId,
    timestamp: Date.now(),
  });

  const usage = await service.getUsage(accountId);
  assertEquals(usage.length, 1);
  assertEquals(usage[0].requestCount, 3);
  assertEquals(usage[0].endpoint, "POST /worlds/abc");
});

Deno.test("SqliteUsageService: Different Endpoints are Separate", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.usageService;
  const accountId = "test-account-multi";
  await setup(context, accountId);

  await service.meter({
    id: ulid(),
    accountId,
    endpoint: "GET /worlds/{worldId}",
    params: { worldId: "A" },
    timestamp: Date.now(),
    statusCode: 200,
  });
  await service.meter({
    id: ulid(),
    accountId,
    endpoint: "POST /worlds/{worldId}",
    params: { worldId: "B" },
    timestamp: Date.now(),
    statusCode: 200,
  });

  const usage = await service.getUsage(accountId);
  assertEquals(usage.length, 2);
  const endpoints = usage.map((u) => u.endpoint).sort();
  assertEquals(endpoints, ["GET /worlds/A", "POST /worlds/B"]);
});
