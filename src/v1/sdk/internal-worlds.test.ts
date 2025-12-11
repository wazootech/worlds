import { assertRejects } from "@std/assert/rejects";
import { assert, assertEquals, assertExists } from "@std/assert";
import { kvAppContext } from "#/app-context.ts";
import accountsApp from "#/v1/routes/accounts/route.ts";
import type { Account } from "#/accounts/accounts-service.ts";
import { InternalWorlds } from "./internal-worlds.ts";

const kv = await Deno.openKv(":memory:");

Deno.test("e2e InternalWorlds", async (t) => {
  const sdk = new InternalWorlds({
    baseUrl: "http://localhost/v1",
    apiKey: Deno.env.get("ADMIN_ACCOUNT_ID")!,
  });

  globalThis.fetch = (
    input: RequestInfo | URL,
    // deno-lint-ignore no-explicit-any
    init?: any,
  ): Promise<Response> => {
    const request = new Request(input, init);
    return accountsApp(kvAppContext(kv)).fetch(request);
  };

  const testAccountId = "test-account-" + Date.now();
  const testAccount: Account = {
    id: testAccountId,
    description: "Test account for SDK",
    plan: "free_plan",
    accessControl: {
      stores: ["test-store-1", "test-store-2"],
    },
  };

  await t.step("createAccount creates a new account", async () => {
    const created = await sdk.createAccount(testAccount);
    assertExists(created);
    assertEquals(created.id, testAccountId);
    assertEquals(created.description, "Test account for SDK");
    assertEquals(created.plan, "free_plan");
  });

  await t.step("getAccount retrieves an account", async () => {
    const retrieved = await sdk.getAccount(testAccountId);
    assertExists(retrieved);
    assertEquals(retrieved.id, testAccountId);
    assertEquals(retrieved.accessControl.stores.length, 2);
  });

  await t.step("updateAccount updates an existing account", async () => {
    const updatedAccount: Account = {
      ...testAccount,
      description: "Updated description",
      accessControl: {
        stores: ["test-store-1", "test-store-2", "test-store-3"],
      },
    };
    await sdk.updateAccount(updatedAccount);

    const retrieved = await sdk.getAccount(testAccountId);
    assertEquals(retrieved.description, "Updated description");
    assertEquals(retrieved.accessControl.stores.length, 3);
  });

  await t.step("deleteAccount removes an account", async () => {
    await sdk.removeAccount(testAccountId);

    await assertRejects(
      async () => await sdk.getAccount(testAccountId),
      Error,
      "404",
    );
  });

  await t.step("createAccount fails with invalid auth", async () => {
    const invalidSdk = new InternalWorlds({
      baseUrl: "http://localhost/v1",
      apiKey: "invalid-key",
    });

    await assertRejects(
      async () => await invalidSdk.createAccount(testAccount),
      Error,
      "401",
    );
  });

  await t.step("deleteAccount fails with invalid auth", async () => {
    const invalidSdk = new InternalWorlds({
      baseUrl: "http://localhost/v1",
      apiKey: "invalid-key",
    });

    await assertRejects(
      async () => await invalidSdk.removeAccount("some-account"),
      Error,
      "401",
    );
  });

  // Import usage app for usage tests
  const usageApp = (await import("#/v1/routes/usage/route.ts")).default;
  globalThis.fetch = (
    input: RequestInfo | URL,
    // deno-lint-ignore no-explicit-any
    init?: any,
  ): Promise<Response> => {
    const request = new Request(input, init);
    return usageApp(kvAppContext(kv)).fetch(request);
  };

  await t.step("getAccountUsage retrieves usage for an account", async () => {
    // Create an account first
    globalThis.fetch = (
      input: RequestInfo | URL,
      // deno-lint-ignore no-explicit-any
      init?: any,
    ): Promise<Response> => {
      const request = new Request(input, init);
      return accountsApp(kvAppContext(kv)).fetch(request);
    };

    const usageTestAccount: Account = {
      id: "usage-test-account",
      description: "Account for usage testing",
      plan: "free_plan",
      accessControl: { stores: [] },
    };
    await sdk.createAccount(usageTestAccount);

    // Switch back to usage app
    globalThis.fetch = (
      input: RequestInfo | URL,
      // deno-lint-ignore no-explicit-any
      init?: any,
    ): Promise<Response> => {
      const request = new Request(input, init);
      return usageApp(kvAppContext(kv)).fetch(request);
    };

    const usage = await sdk.getAccountUsage("usage-test-account");
    assert(typeof usage === "object");
    assert(usage.stores !== undefined);
  });
});
