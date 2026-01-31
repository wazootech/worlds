import { assert, assertEquals } from "@std/assert";
import { createServer } from "#/server/server.ts";
import { createTestContext } from "#/server/testing.ts";
import { WorldsSdk } from "#/sdk/sdk.ts";

Deno.test("WorldsSdk - Invites", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);
  const sdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey, // Use admin API key for SDK
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  await t.step("create invite", async () => {
    const invite = await sdk.invites.create({ code: "sdk_invite_test" });
    assertEquals(invite.code, "sdk_invite_test");
    assertEquals(invite.redeemedBy, null);
    assertEquals(invite.redeemedAt, null);
  });

  await t.step("create invite with auto-generated code", async () => {
    const invite = await sdk.invites.create();
    assert(invite.code !== undefined);
    assert(invite.code.length > 0);
  });

  await t.step("get invite", async () => {
    const invite = await sdk.invites.get("sdk_invite_test");
    assert(invite !== null);
    assertEquals(invite.code, "sdk_invite_test");

    const nonExistent = await sdk.invites.get("non_existent_code");
    assertEquals(nonExistent, null);
  });

  await t.step("list invites pagination", async () => {
    await sdk.invites.create({ code: "invite_page_1" });
    await sdk.invites.create({ code: "invite_page_2" });

    const page1 = await sdk.invites.list(1, 1);
    assertEquals(page1.length, 1);

    const page2 = await sdk.invites.list(2, 1);
    assertEquals(page2.length, 1);
    assert(page1[0].code !== page2[0].code);

    // Clean up
    await sdk.invites.delete("invite_page_1");
    await sdk.invites.delete("invite_page_2");
  });

  await t.step("list invites", async () => {
    const invites = await sdk.invites.list();
    assert(invites.length >= 1);
    const found = invites.find((i: { code: string }) =>
      i.code === "sdk_invite_test"
    );
    assert(found !== undefined);
  });

  await t.step("redeem invite", async () => {
    // Create a tenant without a plan
    const tenant = await sdk.tenants.create({
      id: "ten_sdk_no_plan",
      description: "Tenant without plan",
    });
    assertEquals(tenant.plan, null);

    // Create user SDK with tenant's API key
    const userSdk = new WorldsSdk({
      baseUrl: "http://localhost",
      apiKey: tenant.apiKey,
      fetch: (url: string | URL | Request, init?: RequestInit) =>
        server.fetch(new Request(url, init)),
    });

    // Create a fresh invite for redemption
    const invite = await sdk.invites.create({ code: "redeem_sdk_test" });
    assertEquals(invite.code, "redeem_sdk_test");

    // Redeem the invite (user must pass their own ID even with their API key)
    const result = await userSdk.invites.redeem(
      "redeem_sdk_test",
      "ten_sdk_no_plan",
    );
    assertEquals(result.plan, "free");

    // Verify tenant now has a plan
    const updatedTenant = await sdk.tenants.get("ten_sdk_no_plan");
    assert(updatedTenant !== null);
    assertEquals(updatedTenant.plan, "free");

    // Verify invite is marked as redeemed
    const redeemedInvite = await sdk.invites.get("redeem_sdk_test");
    assert(redeemedInvite !== null);
    assertEquals(redeemedInvite.redeemedBy, "ten_sdk_no_plan");
    assert(redeemedInvite.redeemedAt !== null);
  });

  await t.step("delete invite", async () => {
    await sdk.invites.delete("sdk_invite_test");
    const invite = await sdk.invites.get("sdk_invite_test");
    assertEquals(invite, null);
  });
});
