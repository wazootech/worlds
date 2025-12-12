import type { StoreMetadata } from "#/oxigraph/oxigraph-service.ts";
import { Store } from "oxigraph";
import { assertEquals } from "@std/assert";
import { kvAppContext } from "#/app-context.ts";
import createApp from "./route.ts";
import type { Account } from "#/accounts/accounts-service.ts";

const kv = await Deno.openKv(":memory:");
const app = await createApp(kvAppContext(kv));

Deno.env.set("ADMIN_ACCOUNT_ID", "admin-secret-token");

const testAccount: Account = {
  id: "11111111-1111-4111-8111-111111111111",
  apiKey: "sk_test_account_1",
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
  assertEquals(created.id, "11111111-1111-4111-8111-111111111111");
  assertEquals(created.description, "Test account");
  assertEquals(created.plan, "free_plan");
  assertEquals(created.apiKey.startsWith("sk_worlds_"), true);
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
        id: "22222222-2222-4222-8222-222222222222",
        description: "Test account 2",
        plan: "pro_plan",
        accessControl: { worlds: [] },
      }),
    }),
  );

  // Then retrieve it
  const req = new Request(
    "http://localhost/v1/accounts/22222222-2222-4222-8222-222222222222",
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
    },
  );
  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const account = await res.json();
  assertEquals(account.id, "22222222-2222-4222-8222-222222222222");
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
        id: "33333333-3333-4333-8333-333333333333",
        description: "Original description",
        plan: "free_plan",
        accessControl: { worlds: ["store-1"] },
      }),
    }),
  );

  // Then update it
  const updatedAccount: Account = {
    id: "33333333-3333-4333-8333-333333333333",
    apiKey: "sk_test_account_3_updated",
    description: "Updated description",
    plan: "pro_plan",
    accessControl: { worlds: ["store-1", "store-2", "store-3"] },
  };

  const req = new Request(
    "http://localhost/v1/accounts/33333333-3333-4333-8333-333333333333",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
      body: JSON.stringify(updatedAccount),
    },
  );
  const res = await app.fetch(req);
  assertEquals(res.status, 204);

  // Verify the update
  const getRes = await app.fetch(
    new Request(
      "http://localhost/v1/accounts/33333333-3333-4333-8333-333333333333",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
        },
      },
    ),
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
        id: "44444444-4444-4444-8444-444444444444",
        description: "To be deleted",
        plan: "free_plan",
        accessControl: { worlds: [] },
      }),
    }),
  );

  // Then delete it
  const req = new Request(
    "http://localhost/v1/accounts/44444444-4444-4444-8444-444444444444",
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
    },
  );
  const res = await app.fetch(req);
  assertEquals(res.status, 204);

  // Verify it's gone
  const getRes = await app.fetch(
    new Request(
      "http://localhost/v1/accounts/44444444-4444-4444-8444-444444444444",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
        },
      },
    ),
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

Deno.test("POST /v1/accounts returns 409 if account already exists", async () => {
  // First create an account
  const accountId = "55555555-5555-5555-8555-555555555555";
  await app.fetch(
    new Request("http://localhost/v1/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
      body: JSON.stringify({
        id: accountId,
        description: "First account",
        plan: "free_plan",
        accessControl: { worlds: [] },
      }),
    }),
  );

  // Try to create it again
  const req = new Request("http://localhost/v1/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
    },
    body: JSON.stringify({
      id: accountId,
      description: "Duplicate account",
      plan: "free_plan",
      accessControl: { worlds: [] },
    }),
  });
  const res = await app.fetch(req);
  assertEquals(res.status, 409);
});

Deno.test("GET /v1/accounts/:accountId/worlds retrieves account worlds metadata", async () => {
  // First create stores with metadata
  const kv = await Deno.openKv(":memory:");
  const testApp = await createApp(kvAppContext(kv));

  // Initialize some stores directly using the service (since we don't have store routes here)
  const { oxigraphService } = kvAppContext(kv);
  await oxigraphService.setStore("store-A", "owner-1", new Store());
  await oxigraphService.setStore("store-B", "owner-1", new Store());

  // Create account with access to these stores
  const accountId = "66666666-6666-6666-8666-666666666666";
  const worlds = ["store-A", "store-B"];
  await testApp.fetch(
    new Request("http://localhost/v1/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
      body: JSON.stringify({
        id: accountId,
        description: "Account with worlds",
        plan: "free_plan",
        accessControl: { worlds },
      }),
    }),
  );

  // Retrieve worlds
  const req = new Request(
    `http://localhost/v1/accounts/${accountId}/worlds`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("ADMIN_ACCOUNT_ID")}`,
      },
    },
  );
  const res = await testApp.fetch(req);
  assertEquals(res.status, 200);

  const retrievedWorlds = await res.json();
  assertEquals(retrievedWorlds.length, 2);

  const storeA = retrievedWorlds.find((w: StoreMetadata) => w.id === "store-A");
  assertEquals(storeA?.createdBy, "owner-1");
  assertEquals(storeA?.tripleCount, 0);

  const storeB = retrievedWorlds.find((w: StoreMetadata) => w.id === "store-B");
  assertEquals(storeB?.createdBy, "owner-1");
  assertEquals(storeB?.tripleCount, 0);

  kv.close();
});
