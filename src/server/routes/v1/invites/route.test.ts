import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid";
import { createTestContext } from "#/server/testing.ts";
import createApp from "./route.ts";
import { invitesAdd, invitesFind } from "#/server/db/queries/invites.sql.ts";
import { accountsAdd, accountsFind } from "#/server/db/queries/accounts.sql.ts";

Deno.test("Invites API routes - Admin CRUD", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);
  const adminApiKey = testContext.admin!.apiKey;

  await t.step("GET /v1/invites returns list of invites", async () => {
    // Create some test invites
    await testContext.libsqlClient.execute({
      sql: invitesAdd,
      args: ["invite1", Date.now(), null, null],
    });
    await testContext.libsqlClient.execute({
      sql: invitesAdd,
      args: ["invite2", Date.now(), null, null],
    });

    const req = new Request("http://localhost/v1/invites", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${adminApiKey}`,
      },
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 200);

    const invites = await res.json();
    assert(Array.isArray(invites));
    assert(invites.length >= 2);
  });

  await t.step("POST /v1/invites creates a new invite", async () => {
    const req = new Request("http://localhost/v1/invites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminApiKey}`,
      },
      body: JSON.stringify({ code: "test_invite_code" }),
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 201);

    const body = await res.json();
    assertEquals(body.code, "test_invite_code");
    assertEquals(body.redeemedBy, null);
    assertEquals(body.redeemedAt, null);
  });

  await t.step("POST /v1/invites generates code if not provided", async () => {
    const req = new Request("http://localhost/v1/invites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminApiKey}`,
      },
      body: JSON.stringify({}),
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 201);

    const body = await res.json();
    assert(body.code, "Code should be auto-generated");
    assert(body.code.length > 0, "Generated code should not be empty");
  });

  await t.step("GET /v1/invites/:code retrieves an invite", async () => {
    // Create test invite
    await testContext.libsqlClient.execute({
      sql: invitesAdd,
      args: ["invite_get_test", Date.now(), null, null],
    });

    const req = new Request("http://localhost/v1/invites/invite_get_test", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${adminApiKey}`,
      },
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 200);

    const invite = await res.json();
    assertEquals(invite.code, "invite_get_test");
  });

  await t.step(
    "GET /v1/invites/:code returns 404 for non-existent invite",
    async () => {
      const req = new Request("http://localhost/v1/invites/nonexistent", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${adminApiKey}`,
        },
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 404);
    },
  );

  await t.step("DELETE /v1/invites/:code removes an invite", async () => {
    // Create test invite
    await testContext.libsqlClient.execute({
      sql: invitesAdd,
      args: ["invite_delete_test", Date.now(), null, null],
    });

    const delReq = new Request(
      "http://localhost/v1/invites/invite_delete_test",
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${adminApiKey}`,
        },
      },
    );
    const delRes = await app.fetch(delReq);
    assertEquals(delRes.status, 204);

    // Verify deletion
    const getReq = new Request(
      "http://localhost/v1/invites/invite_delete_test",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${adminApiKey}`,
        },
      },
    );
    const getRes = await app.fetch(getReq);
    assertEquals(getRes.status, 404);
  });
});

Deno.test("Invites API routes - Redemption", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step("Redeem invite upgrades nullish plan to free", async () => {
    // Create an account with no plan
    const userApiKey = ulid();
    await testContext.libsqlClient.execute({
      sql: accountsAdd,
      args: [
        "acc_no_plan",
        "Account without plan",
        null,
        userApiKey,
        Date.now(),
        Date.now(),
        null,
      ],
    });

    // Create an invite
    await testContext.libsqlClient.execute({
      sql: invitesAdd,
      args: ["redeem_test_invite", Date.now(), null, null],
    });

    // Redeem the invite
    const req = new Request(
      "http://localhost/v1/invites/redeem_test_invite/redeem",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userApiKey}`,
        },
      },
    );
    const res = await app.fetch(req);
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.plan, "free");

    // Verify account plan was updated
    const accountResult = await testContext.libsqlClient.execute({
      sql: accountsFind,
      args: ["acc_no_plan"],
    });
    assertEquals(accountResult.rows[0]?.plan, "free");

    // Verify invite was marked as redeemed
    const inviteResult = await testContext.libsqlClient.execute({
      sql: invitesFind,
      args: ["redeem_test_invite"],
    });
    assertEquals(inviteResult.rows[0]?.redeemed_by, "acc_no_plan");
    assert(inviteResult.rows[0]?.redeemed_at);
  });

  await t.step("Redeem invite upgrades shadow plan to free", async () => {
    // Create an account with 'shadow' plan
    const userApiKey = ulid();
    await testContext.libsqlClient.execute({
      sql: accountsAdd,
      args: [
        "acc_shadow_plan",
        "Account with shadow plan",
        "shadow",
        userApiKey,
        Date.now(),
        Date.now(),
        null,
      ],
    });

    // Create an invite
    await testContext.libsqlClient.execute({
      sql: invitesAdd,
      args: ["redeem_shadow_test_invite", Date.now(), null, null],
    });

    // Redeem the invite
    const req = new Request(
      "http://localhost/v1/invites/redeem_shadow_test_invite/redeem",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userApiKey}`,
        },
      },
    );
    const res = await app.fetch(req);
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.plan, "free");

    // Verify account plan was updated
    const accountResult = await testContext.libsqlClient.execute({
      sql: accountsFind,
      args: ["acc_shadow_plan"],
    });
    assertEquals(accountResult.rows[0]?.plan, "free");
  });

  await t.step("Redeem already redeemed invite returns 410", async () => {
    // Create an account with no plan
    const userApiKey = ulid();
    await testContext.libsqlClient.execute({
      sql: accountsAdd,
      args: [
        "acc_no_plan_2",
        "Account without plan",
        null,
        userApiKey,
        Date.now(),
        Date.now(),
        null,
      ],
    });

    // Create an already redeemed invite
    await testContext.libsqlClient.execute({
      sql: invitesAdd,
      args: [
        "already_redeemed_invite",
        Date.now(),
        "another_account",
        Date.now(),
      ],
    });

    const req = new Request(
      "http://localhost/v1/invites/already_redeemed_invite/redeem",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userApiKey}`,
        },
      },
    );
    const res = await app.fetch(req);
    assertEquals(res.status, 410);
  });

  await t.step("Redeem invite fails if account already has plan", async () => {
    // Create an account WITH a plan
    const userApiKey = ulid();
    await testContext.libsqlClient.execute({
      sql: accountsAdd,
      args: [
        "acc_with_plan",
        "Account with plan",
        "pro",
        userApiKey,
        Date.now(),
        Date.now(),
        null,
      ],
    });

    // Create an invite
    await testContext.libsqlClient.execute({
      sql: invitesAdd,
      args: ["invite_for_existing_plan", Date.now(), null, null],
    });

    const req = new Request(
      "http://localhost/v1/invites/invite_for_existing_plan/redeem",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userApiKey}`,
        },
      },
    );
    const res = await app.fetch(req);
    assertEquals(res.status, 409);
  });

  await t.step("Redeem non-existent invite returns 404", async () => {
    // Create an account with no plan
    const userApiKey = ulid();
    await testContext.libsqlClient.execute({
      sql: accountsAdd,
      args: [
        "acc_for_404",
        "Account for 404 test",
        null,
        userApiKey,
        Date.now(),
        Date.now(),
        null,
      ],
    });

    const req = new Request(
      "http://localhost/v1/invites/nonexistent_invite/redeem",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userApiKey}`,
        },
      },
    );
    const res = await app.fetch(req);
    assertEquals(res.status, 404);
  });
});

Deno.test("Invites API routes - Authorization", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step("Non-admin cannot list invites", async () => {
    // Create a non-admin account
    const userApiKey = ulid();
    await testContext.libsqlClient.execute({
      sql: accountsAdd,
      args: [
        "acc_non_admin",
        "Non-admin account",
        "free",
        userApiKey,
        Date.now(),
        Date.now(),
        null,
      ],
    });

    const req = new Request("http://localhost/v1/invites", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userApiKey}`,
      },
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 403);
  });

  await t.step("Non-admin cannot create invites", async () => {
    const userApiKey = ulid();
    await testContext.libsqlClient.execute({
      sql: accountsAdd,
      args: [
        "acc_non_admin_2",
        "Non-admin account 2",
        "free",
        userApiKey,
        Date.now(),
        Date.now(),
        null,
      ],
    });

    const req = new Request("http://localhost/v1/invites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userApiKey}`,
      },
      body: JSON.stringify({ code: "unauthorized_invite" }),
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 403);
  });

  await t.step("Unauthenticated request returns 401", async () => {
    const req = new Request("http://localhost/v1/invites", {
      method: "GET",
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 401);
  });
});
