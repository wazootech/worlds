import { assertEquals } from "@std/assert";
import { kvAppContext } from "#/app-context.ts";
import createApp from "./route.ts";
import type {
  Account,
  AccountUsageEvent,
} from "#/accounts/accounts-service.ts";

const kv = await Deno.openKv(":memory:");
const appContext = kvAppContext(kv);
const app = await createApp(appContext);

// Create a test account
const testAccount: Account = {
  id: "test-account",
  description: "Test account for usage route tests",
  plan: "free_plan",
  accessControl: {
    worlds: ["test-store-1", "test-store-2"],
  },
};
await appContext.accountsService.set(testAccount);

const testApiKey = "test-account";

Deno.test("GET /v1/usage returns usage summary for authenticated user", async () => {
  // First, create some usage data
  const event: AccountUsageEvent = {
    id: "event-1",
    accountId: "test-account",
    timestamp: Date.now(),
    endpoint: "GET /worlds/{worldId}",
    params: { worldId: "test-store-1" },
    statusCode: 200,
  };
  await appContext.accountsService.meter(event);

  const req = new Request("http://localhost/v1/usage", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${testApiKey}`,
    },
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const usageSummary = await res.json();
  assertEquals(typeof usageSummary.worlds, "object");
  assertEquals(usageSummary.worlds["test-store-1"].reads, 1);
});

Deno.test("GET /v1/usage returns empty summary when no usage exists", async () => {
  // Create a new account with no usage
  const newAccount: Account = {
    id: "new-account",
    description: "New account with no usage",
    plan: "free_plan",
    accessControl: {
      worlds: [],
    },
  };
  await appContext.accountsService.set(newAccount);

  const req = new Request("http://localhost/v1/usage", {
    method: "GET",
    headers: {
      "Authorization": "Bearer new-account",
    },
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const usageSummary = await res.json();
  assertEquals(usageSummary.worlds, {});
});

Deno.test("GET /v1/usage returns 401 without authentication", async () => {
  const req = new Request("http://localhost/v1/usage", {
    method: "GET",
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 401);
});

Deno.test("GET /v1/usage with admin account and accountId query param", async () => {
  // Create some usage for test-account
  const event: AccountUsageEvent = {
    id: "event-admin-test",
    accountId: "test-account",
    timestamp: Date.now(),
    endpoint: "POST /worlds/{worldId}",
    params: { worldId: "test-store-2" },
    statusCode: 204,
  };
  await appContext.accountsService.meter(event);

  const adminAccountId = Deno.env.get("ADMIN_ACCOUNT_ID") || "admin";
  const req = new Request(
    `http://localhost/v1/usage?accountId=test-account`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${adminAccountId}`,
      },
    },
  );
  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const usageSummary = await res.json();
  assertEquals(typeof usageSummary.worlds, "object");
  assertEquals(usageSummary.worlds["test-store-2"].writes, 1);
});

Deno.test("GET /v1/usage with admin account but no accountId returns 400", async () => {
  const adminAccountId = Deno.env.get("ADMIN_ACCOUNT_ID") || "admin";
  const req = new Request("http://localhost/v1/usage", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${adminAccountId}`,
    },
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 400);

  const error = await res.json();
  assertEquals(
    error.error,
    "Admin users must specify accountId query parameter",
  );
});
