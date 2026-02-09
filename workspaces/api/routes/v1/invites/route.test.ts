import { assert, assertEquals } from "@std/assert";
// import { ulid } from "@std/ulid/ulid";
import { createTestContext } from "#/lib/testing/context.ts";
import { InvitesService } from "#/lib/database/tables/invites/service.ts";
import createApp from "./route.ts";

Deno.test("Invites API routes - Admin CRUD", async (t) => {
  const testContext = await createTestContext();
  const invitesService = new InvitesService(testContext.database);
  const app = createApp(testContext);
  const adminApiKey = testContext.admin!.apiKey;

  await t.step("GET /v1/invites returns list of invites", async () => {
    // Create some test invites
    await invitesService.add({
      code: "invite1",
      created_at: Date.now(),
      redeemed_by: null,
      redeemed_at: null,
    });
    await invitesService.add({
      code: "invite2",
      created_at: Date.now(),
      redeemed_by: null,
      redeemed_at: null,
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
    await invitesService.add({
      code: "invite_get_test",
      created_at: Date.now(),
      redeemed_by: null,
      redeemed_at: null,
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
    await invitesService.add({
      code: "invite_delete_test",
      created_at: Date.now(),
      redeemed_by: null,
      redeemed_at: null,
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
