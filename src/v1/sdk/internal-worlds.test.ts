import { assertRejects } from "@std/assert/rejects";
import { assert, assertEquals, assertExists } from "@std/assert";
import { kvAppContext } from "#/app-context.ts";
import accountsApp from "#/v1/routes/accounts/route.ts";
import usageApp from "#/v1/routes/usage/route.ts";
import type { Account } from "#/accounts/accounts-service.ts";
import { InternalWorlds } from "./internal-worlds.ts";

const kv = await Deno.openKv(":memory:");
Deno.env.set("ADMIN_API_KEY", "admin-secret-token");

Deno.test("e2e InternalWorlds", async (t) => {
  const sdk = new InternalWorlds({
    baseUrl: "http://localhost/v1",
    apiKey: Deno.env.get("ADMIN_API_KEY")!,
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
    apiKey: "sk_test_123",
    description: "Test account for SDK",
    plan: "free_plan",
    accessControl: {
      worlds: ["test-world-1", "test-world-2"],
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
    assertEquals(retrieved.accessControl.worlds.length, 2);
  });

  await t.step("updateAccount updates an existing account", async () => {
    const updatedAccount: Account = {
      ...testAccount,
      description: "Updated description",
      accessControl: {
        worlds: ["test-world-1", "test-world-2", "test-world-3"],
      },
    };
    await sdk.updateAccount(updatedAccount);

    const retrieved = await sdk.getAccount(testAccountId);
    assertEquals(retrieved.description, "Updated description");
    assertEquals(retrieved.accessControl.worlds.length, 3);
  });

  await t.step("removeAccount removes an account", async () => {
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

  await t.step("removeAccount fails with invalid auth", async () => {
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
      apiKey: "sk_test_456",
      description: "Account for usage testing",
      plan: "free_plan",
      accessControl: { worlds: [] },
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
    assert(usage.worlds !== undefined);
  });

  await t.step(
    "getAccountWorlds retrieves account worlds metadata",
    async () => {
      // Setup - ensure we use the accounts app for creation
      globalThis.fetch = (
        input: RequestInfo | URL,
        // deno-lint-ignore no-explicit-any
        init?: any,
      ) => {
        const request = new Request(input, init);
        return accountsApp(kvAppContext(kv)).fetch(request);
      };

      // Setup - create an account
      const worldsTestAccount: Account = {
        id: "worlds-test-account",
        apiKey: "sk_test_789",
        description: "Account for worlds testing",
        plan: "free_plan",
        accessControl: { worlds: ["world-A", "world-B"] },
      };
      await sdk.createAccount(worldsTestAccount);

      // Mock the fetch response to simulate metadata return from the API
      // This avoids needing to complexly inject metadata into Oxigraph via the service in this test
      globalThis.fetch = (
        input: RequestInfo | URL,
        // deno-lint-ignore no-explicit-any
        init?: any,
      ) => {
        if (
          typeof input === "string" && input.includes("/worlds") &&
          input.endsWith("/worlds")
        ) {
          return Promise.resolve(Response.json([
            { id: "world-A", createdBy: "owner-1", size: 100 },
            { id: "world-B", createdBy: "owner-1", size: 200 },
          ]));
        }
        const request = new Request(input, init);
        return accountsApp(kvAppContext(kv)).fetch(request);
      };

      const worlds = await sdk.getAccountWorlds("worlds-test-account");
      assertEquals(worlds.length, 2);
      assertEquals(worlds[0].id, "world-A");
      assertEquals(worlds[1].id, "world-B");
    },
  );
});
