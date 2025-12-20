import { assert, assertEquals } from "@std/assert";
import { sqliteAppContext } from "#/server/app-context.ts";
import type { Account } from "#/accounts/service.ts";

Deno.test("SqliteAccountsService: Set and Get Account", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.accountsService;

  const account: Account = {
    id: "test-account-1",
    apiKey: "sk_test_123",
    description: "Test Account",
    plan: "free",
    accessControl: { worlds: [] },
  };

  await service.set(account);

  const retrieved = await service.get(account.id);
  assert(retrieved);
  assertEquals(retrieved.id, account.id);
  assertEquals(retrieved.apiKey, account.apiKey);
  assertEquals(retrieved.description, account.description);
  assertEquals(retrieved.plan, account.plan);
});

Deno.test("SqliteAccountsService: Get by API Key", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.accountsService;

  const account: Account = {
    id: "test-account-2",
    apiKey: "sk_test_456",
    description: "Test Account Api Key",
    plan: "pro",
    accessControl: { worlds: [] },
  };

  await service.set(account);

  const retrieved = await service.getByApiKey(account.apiKey);
  assert(retrieved);
  assertEquals(retrieved.id, account.id);
});

Deno.test("SqliteAccountsService: Remove Account", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.accountsService;

  const account: Account = {
    id: "test-account-3",
    apiKey: "sk_test_789",
    description: "Test Account Removal",
    plan: "free",
    accessControl: { worlds: [] },
  };

  await service.set(account);
  assert(await service.get(account.id));

  await service.remove(account.id);
  const retrieved = await service.get(account.id);
  assertEquals(retrieved, null);
});

Deno.test("SqliteAccountsService: List Accounts", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.accountsService;

  await service.set({
    id: "acc1",
    apiKey: "k1",
    description: "d1",
    plan: "free",
    accessControl: { worlds: [] },
  });
  await service.set({
    id: "acc2",
    apiKey: "k2",
    description: "d2",
    plan: "free",
    accessControl: { worlds: [] },
  });

  const list = await service.listAccounts();
  assertEquals(list.length, 2);
  const ids = list.map((a) => a.id).sort();
  assertEquals(ids, ["acc1", "acc2"]);
});

Deno.test("SqliteAccountsService: Add and Remove World Access", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.accountsService;
  const accountId = "test-account-access";
  const worldId = "test-world-access";

  await service.set({
    id: accountId,
    apiKey: "k3",
    description: "d3",
    plan: "free",
    accessControl: { worlds: [] },
  });

  await service.addWorldAccess(accountId, worldId);

  const accountWithAccess = await service.get(accountId);
  assert(accountWithAccess);
  assert(accountWithAccess.accessControl.worlds.includes(worldId));

  await service.removeWorldAccess(accountId, worldId);

  const accountWithoutAccess = await service.get(accountId);
  assert(accountWithoutAccess);
  assert(!accountWithoutAccess.accessControl.worlds.includes(worldId));
});
