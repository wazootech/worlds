import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid";
import { createTestContext } from "#/server/testing.ts";
import createApp from "./route.ts";
import { tenantsAdd, tenantsFind } from "#/server/db/queries/tenants.sql.ts";

Deno.test("Accounts API routes (Deprecated)", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step(
    "GET /v1/accounts returns paginated list of accounts (tenants)",
    async () => {
      const apiKey1 = ulid();
      const now1 = Date.now();
      await testContext.libsqlClient.execute({
        sql: tenantsAdd,
        args: ["acc_1", "Test account 1", "free", apiKey1, now1, now1, null],
      });

      const apiKey2 = ulid();
      const now2 = Date.now();
      await testContext.libsqlClient.execute({
        sql: tenantsAdd,
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
      assert(res.headers.get("Deprecation") === "true");

      const accounts = await res.json();
      assert(Array.isArray(accounts));
      assert(accounts.length >= 2);
    },
  );
});

Deno.test("Accounts API routes - CRUD operations (Deprecated)", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step("POST /v1/accounts creates a new account (tenant)", async () => {
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
    assert(res.headers.get("Deprecation") === "true");

    const body = await res.json();
    assertEquals(body.id, "acc_new");
    assertEquals(body.description, "Test account");
    assertEquals(body.plan, "free");
  });

  await t.step("GET /v1/accounts/:account retrieves an account", async () => {
    const apiKey = ulid();
    const now = Date.now();
    await testContext.libsqlClient.execute({
      sql: tenantsAdd,
      args: ["acc_get", "Test account 2", "pro", apiKey, now, now, null],
    });
    const accountId = "acc_get";

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
    assert(res.headers.get("Deprecation") === "true");

    const account = await res.json();
    assertEquals(account.description, "Test account 2");
    assertEquals(account.plan, "pro");
  });

  await t.step("PUT /v1/accounts/:account updates an account", async () => {
    const apiKey = ulid();
    const now = Date.now();
    await testContext.libsqlClient.execute({
      sql: tenantsAdd,
      args: ["acc_put", "Original description", "free", apiKey, now, now, null],
    });
    const accountId = "acc_put";

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
    assert(res.headers.get("Deprecation") === "true");

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
  });

  await t.step("DELETE /v1/accounts/:account removes an account", async () => {
    const apiKey = ulid();
    const now = Date.now();
    await testContext.libsqlClient.execute({
      sql: tenantsAdd,
      args: ["acc_del", "To be deleted", "free", apiKey, now, now, null],
    });
    const accountId = "acc_del";

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
    assert(res.headers.get("Deprecation") === "true");

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
      const apiKey = ulid();
      const now = Date.now();
      await testContext.libsqlClient.execute({
        sql: tenantsAdd,
        args: ["acc_rot", "Account to rotate", "free", apiKey, now, now, null],
      });
      const accountId = "acc_rot";

      const accountResult = await testContext.libsqlClient.execute({
        sql: tenantsFind,
        args: [accountId],
      });
      const originalApiKey = accountResult.rows[0].api_key as string;

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
      assert(res.headers.get("Deprecation") === "true");

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
      assert(account.apiKey !== originalApiKey);
    },
  );
});
