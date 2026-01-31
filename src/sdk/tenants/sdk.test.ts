import { assert, assertEquals } from "@std/assert";
import { createServer } from "#/server/server.ts";
import { createTestContext } from "#/server/testing.ts";
import { WorldsSdk } from "#/sdk/sdk.ts";

Deno.test("WorldsSdk - Tenants", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);
  const sdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey, // Use admin API key for SDK
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  await t.step("create tenant", async () => {
    const tenant = await sdk.tenants.create({
      id: "ten_sdk_test",
      description: "SDK Test Tenant",
      plan: "free",
    });
    assertEquals(tenant.id, "ten_sdk_test");
    assertEquals(tenant.description, "SDK Test Tenant");
    assertEquals(tenant.plan, "free");
  });

  await t.step("get tenant", async () => {
    const tenant = await sdk.tenants.get("ten_sdk_test");
    assert(tenant !== null);
    assertEquals(tenant.id, "ten_sdk_test");
    assertEquals(tenant.description, "SDK Test Tenant");

    const nonExistent = await sdk.tenants.get("non_existent");
    assertEquals(nonExistent, null);
  });

  await t.step("list tenants pagination", async () => {
    // Create more tenants for pagination
    await sdk.tenants.create({ id: "ten_page_1" });
    await sdk.tenants.create({ id: "ten_page_2" });

    const page1 = await sdk.tenants.list(1, 1);
    assertEquals(page1.length, 1);

    const page2 = await sdk.tenants.list(2, 1);
    assertEquals(page2.length, 1);
    assert(page1[0].id !== page2[0].id);

    // Clean up
    await sdk.tenants.delete("ten_page_1");
    await sdk.tenants.delete("ten_page_2");
  });

  await t.step("list tenants", async () => {
    const tenants = await sdk.tenants.list();
    assert(tenants.length >= 1);
    const found = tenants.find((a: { id: string }) => a.id === "ten_sdk_test");
    assert(found !== undefined);
  });

  await t.step("update tenant", async () => {
    await sdk.tenants.update("ten_sdk_test", {
      description: "Updated SDK Tenant",
    });
    const tenant = await sdk.tenants.get("ten_sdk_test");
    assert(tenant !== null);
    assertEquals(tenant.description, "Updated SDK Tenant");
  });

  await t.step("rotate tenant key", async () => {
    const original = await sdk.tenants.get("ten_sdk_test");
    await sdk.tenants.rotate("ten_sdk_test");
    const rotated = await sdk.tenants.get("ten_sdk_test");
    assert(original && rotated);
    assert(original.apiKey !== rotated.apiKey);
  });

  await t.step("delete tenant", async () => {
    await sdk.tenants.delete("ten_sdk_test");
    const tenant = await sdk.tenants.get("ten_sdk_test");
    assertEquals(tenant, null);
  });
});
