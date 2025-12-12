import { assertEquals } from "@std/assert";
import { kvAppContext } from "#/app-context.ts";
import createApp from "./route.ts";
import type { Account } from "#/accounts/accounts-service.ts";

const kv = await Deno.openKv(":memory:");
const app = await createApp(kvAppContext(kv));

const testAccount: Account = {
  id: "test-account-1",
  description: "Test account",
  plan: "free_plan",
  accessControl: {
    worlds: ["store-1", "store-2"],
  },
};

Deno.test("POST /v1/accounts creates a new account", async () => {
  const req = new Request("http://localhost/v1/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
    },
    body: JSON.stringify(testAccount),
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 201);

  const created = await res.json();
  assertEquals(created.id, "test-account-1");
  assertEquals(created.description, "Test account");
  assertEquals(created.plan, "free_plan");
});

Deno.test("GET /v1/accounts/:accountId retrieves an account", async () => {
  // First create an account
  await app.fetch(
    new Request("http://localhost/v1/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
      body: JSON.stringify({
        id: "test-account-2",
        description: "Test account 2",
        plan: "pro_plan",
        accessControl: { worlds: [] },
      }),
    }),
  );

  // Then retrieve it
  const req = new Request("http://localhost/v1/accounts/test-account-2", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
    },
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const account = await res.json();
  assertEquals(account.id, "test-account-2");
  assertEquals(account.plan, "pro_plan");
});

Deno.test("PUT /v1/accounts/:accountId updates an account", async () => {
  // First create an account
  await app.fetch(
    new Request("http://localhost/v1/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
      body: JSON.stringify({
        id: "test-account-3",
        description: "Original description",
        plan: "free_plan",
        accessControl: { worlds: ["store-1"] },
      }),
    }),
  );

  // Then update it
  const updatedAccount: Account = {
    id: "test-account-3",
    description: "Updated description",
    plan: "pro_plan",
    accessControl: { worlds: ["store-1", "store-2", "store-3"] },
  };

  const req = new Request("http://localhost/v1/accounts/test-account-3", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
    },
    body: JSON.stringify(updatedAccount),
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 204);

  // Verify the update
  const getRes = await app.fetch(
    new Request("http://localhost/v1/accounts/test-account-3", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
    }),
  );
  const account = await getRes.json();
  assertEquals(account.description, "Updated description");
  assertEquals(account.plan, "pro_plan");
  assertEquals(account.accessControl.worlds.length, 3);
});

Deno.test("DELETE /v1/accounts/:accountId removes an account", async () => {
  // First create an account
  await app.fetch(
    new Request("http://localhost/v1/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
      body: JSON.stringify({
        id: "test-account-4",
        description: "To be deleted",
        plan: "free_plan",
        accessControl: { worlds: [] },
      }),
    }),
  );

  // Then delete it
  const req = new Request("http://localhost/v1/accounts/test-account-4", {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
    },
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 204);

  // Verify it's gone
  const getRes = await app.fetch(
    new Request("http://localhost/v1/accounts/test-account-4", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
    }),
  );
  assertEquals(getRes.status, 404);
});

Deno.test("POST /v1/accounts returns 401 without valid auth", async () => {
  const req = new Request("http://localhost/v1/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid-token",
    },
    body: JSON.stringify(testAccount),
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 401);
});

Deno.test("GET /v1/accounts/:accountId returns 404 for non-existent account", async () => {
  const req = new Request("http://localhost/v1/accounts/non-existent", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
    },
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 404);
});

Deno.test("PUT /v1/accounts/:accountId returns 400 for ID mismatch", async () => {
  const req = new Request("http://localhost/v1/accounts/account-a", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
    },
    body: JSON.stringify({
      id: "account-b",
      description: "Mismatched ID",
      plan: "free_plan",
      accessControl: { worlds: [] },
    }),
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 400);
});
