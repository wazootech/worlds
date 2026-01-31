import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid";
import { createTestContext } from "#/server/testing.ts";
import createApp from "./route.ts";
import {
  invitesAdd,
  invitesFind,
} from "#/server/db/resources/invites/queries.sql.ts";
import {
  tenantsAdd,
  tenantsFind,
} from "#/server/db/resources/tenants/queries.sql.ts";

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
    // Create a tenant with no plan
    const userApiKey = ulid();
    await testContext.libsqlClient.execute({
      sql: tenantsAdd,
      args: [
        "ten_no_plan",
        null, // label
        "Tenant without plan",
        null, // plan
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

    // Verify tenant plan was updated
    const tenantResult = await testContext.libsqlClient.execute({
      sql: tenantsFind,
      args: ["ten_no_plan"],
    });
    assertEquals(tenantResult.rows[0]?.plan, "free");

    // Verify invite was marked as redeemed
    const inviteResult = await testContext.libsqlClient.execute({
      sql: invitesFind,
      args: ["redeem_test_invite"],
    });
    assertEquals(inviteResult.rows[0]?.redeemed_by, "ten_no_plan");
    assert(inviteResult.rows[0]?.redeemed_at);
  });
});
