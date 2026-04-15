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
      const namespaces = new NamespacesRepository(appContext.libsql.database);
      const ns = await namespaces.get("_");
      assertExists(ns);
      assertEquals(ns.id, "_");
      assertEquals(ns.label, "Root Namespace");
    });

    await t.step("registry bootstrapping with API key", async () => {
      const apiKeys = new ApiKeysRepository(appContext.libsql.database);
      const namespace = await apiKeys.resolveNamespace(apiKey);
      assertEquals(namespace, "_");
    });

    await t.step(
      "worlds are isolated per namespace",
      async () => {
        const tenantContext = {
          ...appContext,
          namespace: "tenant",
        };
        await using tenantWorlds = new LocalWorlds(tenantContext);
        await tenantWorlds.create({ slug: "tenant-world", label: "Tenant World" });

        const list = await tenantWorlds.list();
        const tenantWorld = list.find((w) => w.slug === "tenant-world");
        assertExists(tenantWorld);
        assertEquals(tenantWorld!.namespace, "tenant");
      },
    );
  },
});