import { assert, assertEquals } from "@std/assert";
import { kvAppContext } from "#/app-context.ts";
import createApp from "./route.ts";
import type { Account } from "#/accounts/accounts-service.ts";

const kv = await Deno.openKv(":memory:");
const appContext = kvAppContext(kv);
const app = await createApp(appContext);
Deno.env.set("ADMIN_API_KEY", "admin-secret-token");

Deno.test("Security: world creation automatically grants access", async () => {
  const testAccount: Account = {
    id: "security-test-account-1",
    apiKey: "sk_test_123",
    description: "Test account for security",
    plan: "free_plan",
    accessControl: {
      worlds: [],
    },
  };
  await appContext.accountsService.set(testAccount);

  const worldId = "security-test-world-1";
  const req = new Request(`http://localhost/v1/worlds/${worldId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${testAccount.apiKey}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o" .',
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 204);

  // Verify world was added to account's access control
  const updatedAccount = await appContext.accountsService.get(testAccount.id);
  assert(updatedAccount);
  assert(updatedAccount.accessControl.worlds.includes(worldId));

  // Verify metadata has createdBy
  const metadata = await appContext.oxigraphService.getMetadata(worldId);
  assert(metadata);
  assertEquals(metadata.createdBy, testAccount.id);
});

Deno.test("Security: Plan limit enforcement for free plan", async () => {
  const testAccount: Account = {
    id: "security-test-account-2",
    apiKey: "sk_test_456",
    description: "Test account for plan limits",
    plan: "free_plan",
    accessControl: {
      worlds: [],
    },
  };
  await appContext.accountsService.set(testAccount);

  // Create 100 stores (free plan limit)
  for (let i = 0; i < 100; i++) {
    const worldId = `limit-test-world-${i}`;
    const req = new Request(`http://localhost/v1/worlds/${worldId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${testAccount.apiKey}`,
      },
      body: '<http://example.com/s> <http://example.com/p> "o" .',
    });

    const res = await app.fetch(req);
    assertEquals(res.status, 204, `Failed to create store ${i}`);
  }

  // Attempt to create 101st store - should fail
  const req = new Request(`http://localhost/v1/worlds/limit-test-world-100`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${testAccount.apiKey}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o" .',
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 403);

  const body = await res.json();
  assertEquals(body.error, "Plan limit reached");
  assertEquals(body.limit, 100);
});

Deno.test("Security: Only owner can delete world", async () => {
  const ownerAccount: Account = {
    id: "security-test-owner",
    apiKey: "sk_test_owner",
    description: "Owner account",
    plan: "free_plan",
    accessControl: {
      worlds: [],
    },
  };
  await appContext.accountsService.set(ownerAccount);

  const otherAccount: Account = {
    id: "security-test-other",
    apiKey: "sk_test_other",
    description: "Other account",
    plan: "free_plan",
    accessControl: {
      worlds: [],
    },
  };
  await appContext.accountsService.set(otherAccount);

  // Owner creates a store
  const worldId = "security-test-ownership-store";
  const createReq = new Request(`http://localhost/v1/worlds/${worldId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${ownerAccount.apiKey}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o" .',
  });

  const createRes = await app.fetch(createReq);
  assertEquals(createRes.status, 204);

  // Manually grant access to other account
  otherAccount.accessControl.worlds.push(worldId);
  await appContext.accountsService.set(otherAccount);

  // Other account attempts to delete - should fail
  const deleteReq1 = new Request(`http://localhost/v1/worlds/${worldId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${otherAccount.apiKey}`,
    },
  });

  const deleteRes1 = await app.fetch(deleteReq1);
  assertEquals(deleteRes1.status, 403);

  const body = await deleteRes1.json();
  assertEquals(
    body.error,
    "Forbidden: Only the world owner can delete this world",
  );

  // Owner deletes successfully
  const deleteReq2 = new Request(`http://localhost/v1/worlds/${worldId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${ownerAccount.apiKey}`,
    },
  });

  const deleteRes2 = await app.fetch(deleteReq2);
  assertEquals(deleteRes2.status, 204);

  // Verify world is removed from owner's access control
  const updatedOwner = await appContext.accountsService.get(ownerAccount.id);
  assert(updatedOwner);
  assert(!updatedOwner.accessControl.worlds.includes(worldId));
});

Deno.test("Security: Admin can delete any world", async () => {
  const ownerAccount: Account = {
    id: "security-test-owner-2",
    apiKey: "sk_test_owner_2",
    description: "Owner account",
    plan: "free_plan",
    accessControl: {
      worlds: [],
    },
  };
  await appContext.accountsService.set(ownerAccount);

  // Owner creates a store
  const worldId = "security-test-admin-delete-store";
  const createReq = new Request(`http://localhost/v1/worlds/${worldId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${ownerAccount.apiKey}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o" .',
  });

  const createRes = await app.fetch(createReq);
  assertEquals(createRes.status, 204);

  // Admin deletes the store
  const adminAccountId = Deno.env.get("ADMIN_API_KEY")!;
  const deleteReq = new Request(`http://localhost/v1/worlds/${worldId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${adminAccountId}`,
    },
  });

  const deleteRes = await app.fetch(deleteReq);
  assertEquals(deleteRes.status, 204);
});

Deno.test("Security: World update doesn't count against plan limit", async () => {
  const testAccount: Account = {
    id: "security-test-account-3",
    apiKey: "sk_test_209",
    description: "Test account for update",
    plan: "free_plan",
    accessControl: {
      worlds: [],
    },
  };
  await appContext.accountsService.set(testAccount);

  const worldId = "security-test-update-store";

  // Create store
  const createReq = new Request(`http://localhost/v1/worlds/${worldId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${testAccount.apiKey}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o1" .',
  });

  const createRes = await app.fetch(createReq);
  assertEquals(createRes.status, 204);

  // Update same store - should succeed
  const updateReq = new Request(`http://localhost/v1/worlds/${worldId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${testAccount.apiKey}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o2" .',
  });

  const updateRes = await app.fetch(updateReq);
  assertEquals(updateRes.status, 204);

  // Verify account still has only 1 store
  const updatedAccount = await appContext.accountsService.get(testAccount.id);
  assert(updatedAccount);
  assertEquals(updatedAccount.accessControl.worlds.length, 1);
});

Deno.test("Security: POST creates new world with ownership tracking", async () => {
  const testAccount: Account = {
    id: "security-test-account-4",
    apiKey: "sk_test_254",
    description: "Test account for POST",
    plan: "free_plan",
    accessControl: {
      worlds: [],
    },
  };
  await appContext.accountsService.set(testAccount);

  const worldId = "security-test-post-store";
  const req = new Request(`http://localhost/v1/worlds/${worldId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${testAccount.apiKey}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o" .',
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 204);

  // Verify world was added to account's access control
  const updatedAccount = await appContext.accountsService.get(testAccount.id);
  assert(updatedAccount);
  assert(updatedAccount.accessControl.worlds.includes(worldId));

  // Verify metadata has createdBy
  const metadata = await appContext.oxigraphService.getMetadata(worldId);
  assert(metadata);
  assertEquals(metadata.createdBy, testAccount.id);
});

Deno.test("Security: Non-owner gets 404 (Privacy)", async () => {
  const ownerAccount: Account = {
    id: "security-test-privacy-owner",
    apiKey: "sk_test_privacy_owner",
    description: "Owner account",
    plan: "free_plan",
    accessControl: { worlds: [] },
  };
  await appContext.accountsService.set(ownerAccount);

  const otherAccount: Account = {
    id: "security-test-privacy-other",
    apiKey: "sk_test_privacy_other",
    description: "Other account",
    plan: "free_plan",
    accessControl: { worlds: [] },
  };
  await appContext.accountsService.set(otherAccount);

  const worldId = "security-test-privacy-store";

  // Create store
  await app.fetch(
    new Request(`http://localhost/v1/worlds/${worldId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${ownerAccount.apiKey}`,
      },
      body: "<http://s> <http://p> <http://o> .",
    }),
  );

  // Other account tries to GET -> 404
  const getRes = await app.fetch(
    new Request(`http://localhost/v1/worlds/${worldId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${otherAccount.apiKey}` },
    }),
  );
  assertEquals(getRes.status, 404);

  // Other account tries to PUT (update) -> 404
  const putRes = await app.fetch(
    new Request(`http://localhost/v1/worlds/${worldId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${otherAccount.apiKey}`,
      },
      body: "<http://s> <http://p> <http://o2> .",
    }),
  );
  assertEquals(putRes.status, 404);
});

Deno.test("Security: Writing to unknown ID claims it (Lazy Claiming)", async () => {
  const testAccount: Account = {
    id: "security-test-lazy-claim",
    apiKey: "sk_test_lazy",
    description: "Lazy claim account",
    plan: "free_plan",
    accessControl: { worlds: [] },
  };
  await appContext.accountsService.set(testAccount);

  const worldId = "lazy-claim-store";

  // Account tries to PUT to non-existent ID
  const putRes = await app.fetch(
    new Request(`http://localhost/v1/worlds/${worldId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${testAccount.apiKey}`,
      },
      body: "<http://s> <http://p> <http://o> .",
    }),
  );

  assertEquals(putRes.status, 204);

  // Verify ownership
  const metadata = await appContext.oxigraphService.getMetadata(worldId);
  assertEquals(metadata?.createdBy, testAccount.id);
});
