import { assert, assertEquals } from "@std/assert";
import { createServer } from "@wazoo/server";
import { createTestContext } from "@wazoo/server/testing";
import { WorldsSdk } from "#/sdk.ts";

Deno.test("WorldsSdk - Organizations", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);
  const sdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey, // Use admin API key for SDK
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  await t.step("create organization", async () => {
    const organization = await sdk.organizations.create({
      id: "org_sdk_test",
      description: "SDK Test Organization",
      label: "Test Label",
      plan: "free",
    });
    assertEquals(organization.id, "org_sdk_test");
    assertEquals(organization.description, "SDK Test Organization");
    assertEquals(organization.plan, "free");
  });

  await t.step("get organization", async () => {
    const organization = await sdk.organizations.get("org_sdk_test");
    assert(organization !== null);
    assertEquals(organization.id, "org_sdk_test");
    assertEquals(organization.description, "SDK Test Organization");

    const nonExistent = await sdk.organizations.get("non_existent");
    assertEquals(nonExistent, null);
  });

  await t.step("list organizations pagination", async () => {
    // Create more organizations for pagination
    await sdk.organizations.create({ id: "org_page_1" });
    await sdk.organizations.create({ id: "org_page_2" });

    const page1 = await sdk.organizations.list(1, 1);
    assertEquals(page1.length, 1);

    const page2 = await sdk.organizations.list(2, 1);
    assertEquals(page2.length, 1);
    assert(page1[0].id !== page2[0].id);

    // Clean up
    await sdk.organizations.delete("org_page_1");
    await sdk.organizations.delete("org_page_2");
  });

  await t.step("list organizations", async () => {
    const organizations = await sdk.organizations.list();
    assert(organizations.length >= 1);
    const found = organizations.find((a: { id: string }) =>
      a.id === "org_sdk_test"
    );
    assert(found !== undefined);
  });

  await t.step("update organization", async () => {
    await sdk.organizations.update("org_sdk_test", {
      description: "Updated SDK Organization",
    });
    const organization = await sdk.organizations.get("org_sdk_test");
    assert(organization !== null);
    assertEquals(organization.description, "Updated SDK Organization");
  });

  await t.step("delete organization", async () => {
    await sdk.organizations.delete("org_sdk_test");
    const organization = await sdk.organizations.get("org_sdk_test");
    assertEquals(organization, null);
  });
});
