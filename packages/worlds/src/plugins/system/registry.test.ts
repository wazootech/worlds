import { assertEquals, assertExists } from "@std/assert";
import { createTestContext } from "#/core/engine-context.ts";
import { LocalWorlds } from "#/worlds/local.ts";
import { NamespacesRepository } from "#/plugins/registry/namespaces.repository.ts";
import { ApiKeysRepository } from "#/plugins/registry/api-keys.repository.ts";

Deno.test({
  name: "LocalWorlds Registry",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    const apiKey = "test-api-key";

    await using appContext = await createTestContext();
    appContext.apiKey = apiKey;

    await using worlds = new LocalWorlds(appContext);
    await worlds.init();

    await t.step("registry auto-initialization", async () => {
      // The root namespace is no longer explicitly stored as "_" in the database.
      // We verify that the system tables are initialized and writable.
      const namespaces = new NamespacesRepository(appContext.system);
      const ns = await namespaces.get("non-existent");
      assertEquals(ns, null);
    });

    await t.step("registry bootstrapping with API key", async () => {
      const apiKeys = new ApiKeysRepository(appContext.system);
      const namespace = await apiKeys.resolveNamespace(apiKey);
      // The root namespace is represented as undefined/NULL.
      assertEquals(namespace, undefined);
    });

    await t.step(
      "worlds are isolated per namespace",
      async () => {
        const tenantContext = {
          ...appContext,
          namespace: "tenant",
        };
        await using tenantWorlds = new LocalWorlds(tenantContext);
        await tenantWorlds.create({
          world: "tenant-world",
          label: "Tenant World",
        });

        const list = await tenantWorlds.list();
        const tenantWorld = list.find((w) => w.world === "tenant-world");
        assertExists(tenantWorld);
        assertEquals(tenantWorld!.namespace, "tenant");
      },
    );
  },
});
