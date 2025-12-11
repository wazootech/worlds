import { assert, assertEquals } from "@std/assert";
import { kvAppContext } from "#/app-context.ts";
import createApp from "./route.ts";
import type { Account } from "#/accounts/accounts-service.ts";

const kv = await Deno.openKv(":memory:");
const appContext = kvAppContext(kv);
const app = await createApp(appContext);

Deno.test("Security: Store creation automatically grants access", async () => {
  const testAccount: Account = {
    id: "security-test-account-1",
    description: "Test account for security",
    plan: "free_plan",
    accessControl: {
      stores: [],
    },
  };
  await appContext.accountsService.set(testAccount);

  const storeId = "security-test-store-1";
  const req = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${testAccount.id}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o" .',
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 204);

  // Verify store was added to account's access control
  const updatedAccount = await appContext.accountsService.get(testAccount.id);
  assert(updatedAccount);
  assert(updatedAccount.accessControl.stores.includes(storeId));

  // Verify metadata has createdBy
  const metadata = await appContext.oxigraphService.getMetadata(storeId);
  assert(metadata);
  assertEquals(metadata.createdBy, testAccount.id);
});

Deno.test("Security: Plan limit enforcement for free plan", async () => {
  const testAccount: Account = {
    id: "security-test-account-2",
    description: "Test account for plan limits",
    plan: "free_plan",
    accessControl: {
      stores: [],
    },
  };
  await appContext.accountsService.set(testAccount);

  // Create 100 stores (free plan limit)
  for (let i = 0; i < 100; i++) {
    const storeId = `limit-test-store-${i}`;
    const req = new Request(`http://localhost/v1/stores/${storeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${testAccount.id}`,
      },
      body: '<http://example.com/s> <http://example.com/p> "o" .',
    });

    const res = await app.fetch(req);
    assertEquals(res.status, 204, `Failed to create store ${i}`);
  }

  // Attempt to create 101st store - should fail
  const req = new Request(`http://localhost/v1/stores/limit-test-store-100`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${testAccount.id}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o" .',
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 403);

  const body = await res.json();
  assertEquals(body.error, "Plan limit reached");
  assertEquals(body.limit, 100);
});

Deno.test("Security: Only owner can delete store", async () => {
  const ownerAccount: Account = {
    id: "security-test-owner",
    description: "Owner account",
    plan: "free_plan",
    accessControl: {
      stores: [],
    },
  };
  await appContext.accountsService.set(ownerAccount);

  const otherAccount: Account = {
    id: "security-test-other",
    description: "Other account",
    plan: "free_plan",
    accessControl: {
      stores: [],
    },
  };
  await appContext.accountsService.set(otherAccount);

  // Owner creates a store
  const storeId = "security-test-ownership-store";
  const createReq = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${ownerAccount.id}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o" .',
  });

  const createRes = await app.fetch(createReq);
  assertEquals(createRes.status, 204);

  // Manually grant access to other account
  otherAccount.accessControl.stores.push(storeId);
  await appContext.accountsService.set(otherAccount);

  // Other account attempts to delete - should fail
  const deleteReq1 = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${otherAccount.id}`,
    },
  });

  const deleteRes1 = await app.fetch(deleteReq1);
  assertEquals(deleteRes1.status, 403);

  const body = await deleteRes1.json();
  assertEquals(
    body.error,
    "Forbidden: Only the store owner can delete this store",
  );

  // Owner deletes successfully
  const deleteReq2 = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${ownerAccount.id}`,
    },
  });

  const deleteRes2 = await app.fetch(deleteReq2);
  assertEquals(deleteRes2.status, 204);

  // Verify store is removed from owner's access control
  const updatedOwner = await appContext.accountsService.get(ownerAccount.id);
  assert(updatedOwner);
  assert(!updatedOwner.accessControl.stores.includes(storeId));
});

Deno.test("Security: Admin can delete any store", async () => {
  const ownerAccount: Account = {
    id: "security-test-owner-2",
    description: "Owner account",
    plan: "free_plan",
    accessControl: {
      stores: [],
    },
  };
  await appContext.accountsService.set(ownerAccount);

  // Owner creates a store
  const storeId = "security-test-admin-delete-store";
  const createReq = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${ownerAccount.id}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o" .',
  });

  const createRes = await app.fetch(createReq);
  assertEquals(createRes.status, 204);

  // Admin deletes the store
  const adminAccountId = Deno.env.get("ADMIN_ACCOUNT_ID")!;
  const deleteReq = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${adminAccountId}`,
    },
  });

  const deleteRes = await app.fetch(deleteReq);
  assertEquals(deleteRes.status, 204);
});

Deno.test("Security: Store update doesn't count against plan limit", async () => {
  const testAccount: Account = {
    id: "security-test-account-3",
    description: "Test account for update",
    plan: "free_plan",
    accessControl: {
      stores: [],
    },
  };
  await appContext.accountsService.set(testAccount);

  const storeId = "security-test-update-store";

  // Create store
  const createReq = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${testAccount.id}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o1" .',
  });

  const createRes = await app.fetch(createReq);
  assertEquals(createRes.status, 204);

  // Update same store - should succeed
  const updateReq = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${testAccount.id}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o2" .',
  });

  const updateRes = await app.fetch(updateReq);
  assertEquals(updateRes.status, 204);

  // Verify account still has only 1 store
  const updatedAccount = await appContext.accountsService.get(testAccount.id);
  assert(updatedAccount);
  assertEquals(updatedAccount.accessControl.stores.length, 1);
});

Deno.test("Security: POST creates new store with ownership tracking", async () => {
  const testAccount: Account = {
    id: "security-test-account-4",
    description: "Test account for POST",
    plan: "free_plan",
    accessControl: {
      stores: [],
    },
  };
  await appContext.accountsService.set(testAccount);

  const storeId = "security-test-post-store";
  const req = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/n-quads",
      "Authorization": `Bearer ${testAccount.id}`,
    },
    body: '<http://example.com/s> <http://example.com/p> "o" .',
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 204);

  // Verify store was added to account's access control
  const updatedAccount = await appContext.accountsService.get(testAccount.id);
  assert(updatedAccount);
  assert(updatedAccount.accessControl.stores.includes(storeId));

  // Verify metadata has createdBy
  const metadata = await appContext.oxigraphService.getMetadata(storeId);
  assert(metadata);
  assertEquals(metadata.createdBy, testAccount.id);
});

Deno.test("Security: Non-owner gets 404 (Privacy)", async () => {
  const ownerAccount: Account = {
    id: "security-test-privacy-owner",
    description: "Owner account",
    plan: "free_plan",
    accessControl: { stores: [] },
  };
  await appContext.accountsService.set(ownerAccount);

  const otherAccount: Account = {
    id: "security-test-privacy-other",
    description: "Other account",
    plan: "free_plan",
    accessControl: { stores: [] },
  };
  await appContext.accountsService.set(otherAccount);

  const storeId = "security-test-privacy-store";

  // Create store
  await app.fetch(
    new Request(`http://localhost/v1/stores/${storeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${ownerAccount.id}`,
      },
      body: "<http://s> <http://p> <http://o> .",
    }),
  );

  // Other account tries to GET -> 404
  const getRes = await app.fetch(
    new Request(`http://localhost/v1/stores/${storeId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${otherAccount.id}` },
    }),
  );
  assertEquals(getRes.status, 404);

  // Other account tries to PUT (update) -> 404
  const putRes = await app.fetch(
    new Request(`http://localhost/v1/stores/${storeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${otherAccount.id}`,
      },
      body: "<http://s> <http://p> <http://o2> .",
    }),
  );
  assertEquals(putRes.status, 404);
});

Deno.test("Security: Writing to unknown ID claims it (Lazy Claiming)", async () => {
  const testAccount: Account = {
    id: "security-test-lazy-claim",
    description: "Lazy claim account",
    plan: "free_plan",
    accessControl: { stores: [] },
  };
  await appContext.accountsService.set(testAccount);

  const storeId = "lazy-claim-store";

  // Account tries to PUT to non-existent ID
  const putRes = await app.fetch(
    new Request(`http://localhost/v1/stores/${storeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${testAccount.id}`,
      },
      body: "<http://s> <http://p> <http://o> .",
    }),
  );

  assertEquals(putRes.status, 204);

  // Verify ownership
  const metadata = await appContext.oxigraphService.getMetadata(storeId);
  assertEquals(metadata?.createdBy, testAccount.id);
});
