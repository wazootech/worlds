import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid";
import { createTestContext } from "#/server/testing.ts";
import createApp from "./route.ts";
import { accountsAdd, accountsFind } from "#/server/db/queries/accounts.sql.ts";

Deno.test("Accounts API routes", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step(
    "GET /v1/accounts returns paginated list of accounts",
    async () => {
      const apiKey1 = ulid();
      const now1 = Date.now();
      await testContext.libsqlClient.execute({
        sql: accountsAdd,
        args: ["acc_1", "Test account 1", "free", apiKey1, now1, now1, null],
      });

      const apiKey2 = ulid();
      const now2 = Date.now();
      await testContext.libsqlClient.execute({
        sql: accountsAdd,
        args: ["acc_2", "Test account 2", "pro", apiKey2, now2, now2, null],
      });

      const req = new Request(
        "http://localhost/v1/accounts?page=1&pageSize=20",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 200);

      const accounts = await res.json();
      assert(Array.isArray(accounts));
      assert(accounts.length >= 2);
    },
  );
});

Deno.test("Accounts API routes - CRUD operations", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step("POST /v1/accounts creates a new account", async () => {
    const req = new Request("http://localhost/v1/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${testContext.admin!.apiKey}`,
      },
      body: JSON.stringify({
        id: "acc_new",
        description: "Test account",
        plan: "free",
      }),
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 201);

    const body = await res.json();
    assertEquals(body.id, "acc_new");
    assertEquals(body.description, "Test account");
    assertEquals(body.plan, "free");
  });

  await t.step(
    "POST /v1/accounts handles missing optional fields",
    async () => {
      const req = new Request("http://localhost/v1/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
        body: JSON.stringify({
          id: "acc_partial",
          // description missing
          // plan missing
        }),
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 201);

      const body = await res.json();
      assertEquals(body.id, "acc_partial");
      assertEquals(body.description, undefined);
      assertEquals(body.plan, undefined);
    },
  );

  await t.step("GET /v1/accounts/:account retrieves an account", async () => {
    // Create an account directly using db
    const apiKey = ulid();
    const now = Date.now();
    await testContext.libsqlClient.execute({
      sql: accountsAdd,
      args: ["acc_get", "Test account 2", "pro", apiKey, now, now, null],
    });
    const accountId = "acc_get";

    // Then retrieve it
    const req = new Request(
      `http://localhost/v1/accounts/${accountId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
      },
    );
    const res = await app.fetch(req);
    assertEquals(res.status, 200);

    const account = await res.json();
    assertEquals(account.description, "Test account 2");
    assertEquals(account.plan, "pro");
    assertEquals(typeof account.apiKey, "string");
    assertEquals(typeof account.createdAt, "number");
    assertEquals(typeof account.updatedAt, "number");
  });

  await t.step("PUT /v1/accounts/:account updates an account", async () => {
    // First create an account
    const apiKey = ulid();
    const now = Date.now();
    await testContext.libsqlClient.execute({
      sql: accountsAdd,
      args: ["acc_put", "Original description", "free", apiKey, now, now, null],
    });
    const accountId = "acc_put";

    // Then update it
    const req = new Request(
      `http://localhost/v1/accounts/${accountId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
        body: JSON.stringify({
          description: "Updated description",
          plan: "pro",
        }),
      },
    );
    const res = await app.fetch(req);
    assertEquals(res.status, 204);

    // Verify the update
    const getRes = await app.fetch(
      new Request(
        `http://localhost/v1/accounts/${accountId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      ),
    );
    const account = await getRes.json();
    assertEquals(account.description, "Updated description");
    assertEquals(account.plan, "pro");
  });

  await t.step("DELETE /v1/accounts/:account removes an account", async () => {
    // First create an account
    const apiKey = ulid();
    const now = Date.now();
    await testContext.libsqlClient.execute({
      sql: accountsAdd,
      args: ["acc_del", "To be deleted", "free", apiKey, now, now, null],
    });
    const accountId = "acc_del";

    // Then delete it
    const req = new Request(
      `http://localhost/v1/accounts/${accountId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
      },
    );
    const res = await app.fetch(req);
    assertEquals(res.status, 204);

    // Verify it's gone
    const getRes = await app.fetch(
      new Request(
        `http://localhost/v1/accounts/${accountId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      ),
    );
    assertEquals(getRes.status, 404);
  });

  await t.step(
    "POST /v1/accounts/:account/rotate rotates account API key",
    async () => {
      // First create an account
      const apiKey = ulid();
      const now = Date.now();
      await testContext.libsqlClient.execute({
        sql: accountsAdd,
        args: ["acc_rot", "Account to rotate", "free", apiKey, now, now, null],
      });
      const accountId = "acc_rot";

      // Get the original API key
      const accountResult = await testContext.libsqlClient.execute({
        sql: accountsFind,
        args: [accountId],
      });
      if (accountResult.rows.length === 0) {
        throw new Error("Failed to find created account");
      }
      const originalApiKey = accountResult.rows[0].api_key as string;

      // Rotate the key
      const req = new Request(
        `http://localhost/v1/accounts/${accountId}/rotate`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 204);

      // Verify the key was rotated
      const getRes = await app.fetch(
        new Request(
          `http://localhost/v1/accounts/${accountId}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${testContext.admin!.apiKey}`,
            },
          },
        ),
      );
      assertEquals(getRes.status, 200);
      const account = await getRes.json();
      assert(
        account.apiKey !== originalApiKey,
        "API key should be different after rotation",
      );
    },
  );

  // Metadata test removed
  await Promise.resolve();
});

Deno.test("Accounts API routes - Error handling", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step("POST /v1/accounts returns 401 without valid auth", async () => {
    const req = new Request("http://localhost/v1/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid-token",
      },
      body: JSON.stringify({
        description: "Test account",
        plan: "free",
        apiKey: ulid(),
      }),
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 401);
  });

  await t.step(
    "POST /v1/accounts returns 403 without admin access",
    async () => {
      // Create a non-admin account
      const now = Date.now();
      await testContext.libsqlClient.execute({
        sql: accountsAdd,
        args: [
          "acc_no_admin",
          "Non-admin account",
          "free",
          "test-api-key-123",
          now,
          now,
          null,
        ],
      });

      const req = new Request("http://localhost/v1/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer test-api-key-123",
        },
        body: JSON.stringify({
          id: "acc_fail",
          description: "Test account",
          plan: "free",
          apiKey: ulid(),
        }),
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 403);
    },
  );

  await t.step(
    "GET /v1/accounts/:account returns 404 for non-existent account",
    async () => {
      const req = new Request("http://localhost/v1/accounts/non-existent-id", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 404);
    },
  );
});

Deno.test("Accounts API routes - Edge cases", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step(
    "POST /v1/accounts can create multiple accounts with same description",
    async () => {
      // Since the route auto-generates IDs, we can create multiple accounts
      // with the same description without conflicts
      const req1 = new Request("http://localhost/v1/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
        body: JSON.stringify({
          id: "acc_dup_1",
          description: "Duplicate description test",
          plan: "free",
          apiKey: ulid(),
        }),
      });
      const res1 = await app.fetch(req1);
      assertEquals(res1.status, 201);

      const req2 = new Request("http://localhost/v1/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
        body: JSON.stringify({
          id: "acc_dup_2",
          description: "Duplicate description test",
          plan: "free",
          apiKey: ulid(),
        }),
      });
      const res2 = await app.fetch(req2);
      assertEquals(res2.status, 201);
    },
  );
});
