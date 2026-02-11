import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import { createServer } from "@wazoo/server";
import { createTestContext } from "@wazoo/server/testing";
import { WorldsSdk } from "#/sdk.ts";

Deno.test("WorldsSdk - Service Accounts", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);

  const adminSdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  const orgId = ulid();
  await adminSdk.organizations.create({
    id: orgId,
    label: "Test Org",
    description: "Description",
  });

  const sdk = adminSdk;

  let createdAccountId: string;

  await t.step("create service account", async () => {
    const account = await sdk.organizations.serviceAccounts.create(orgId, {
      label: "Test Account",
      description: "A test service account",
    });
    assertEquals(account.label, "Test Account");
    assertEquals(account.description, "A test service account");
    assertEquals(account.organizationId, orgId);
    assert(account.apiKey !== undefined);
    assert(account.id !== undefined);
    createdAccountId = account.id;
  });

  await t.step("get service account", async () => {
    const account = await sdk.organizations.serviceAccounts.get(
      orgId,
      createdAccountId,
    );
    assert(account !== null);
    assertEquals(account.id, createdAccountId);
    assertEquals(account.label, "Test Account");
  });

  await t.step("update service account", async () => {
    await sdk.organizations.serviceAccounts.update(orgId, createdAccountId, {
      label: "Updated Account",
    });
    const account = await sdk.organizations.serviceAccounts.get(
      orgId,
      createdAccountId,
    );
    assertEquals(account!.label, "Updated Account");
    assertEquals(account!.description, "A test service account");
  });

  await t.step("list service accounts", async () => {
    const accounts = await sdk.organizations.serviceAccounts.list(orgId);
    assert(accounts.length >= 1);
    const found = accounts.find((a) => a.id === createdAccountId);
    assert(found !== undefined);
  });

  await t.step("delete service account", async () => {
    await sdk.organizations.serviceAccounts.delete(orgId, createdAccountId);
    const account = await sdk.organizations.serviceAccounts.get(
      orgId,
      createdAccountId,
    );
    assertEquals(account, null);
  });
});
