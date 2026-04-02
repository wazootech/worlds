import { assertEquals, assertExists } from "@std/assert";
import { createTestContext } from "./engine-context.ts";
import { LocalWorlds } from "./local.ts";
import { KERNEL, KERNEL_WORLD_ID } from "./ontology.ts";
import type { SparqlSelectResults } from "./schemas/mod.ts";

Deno.test("LocalWorlds Kernel", async (t) => {
  const apiKey = "test-api-key";
  const orgId = "https://wazoo.dev/kernel/organizations/test-org";

  const appContext = await createTestContext();
  appContext.apiKey = apiKey;
  appContext.organizationId = orgId;

  const worlds = new LocalWorlds(appContext);

  try {
    await t.step("kernel world auto-initialization", async () => {
      // Calling any method should trigger the initialization
      const kernelWorld = await worlds.get({ world: KERNEL_WORLD_ID });
      assertExists(kernelWorld);
      assertEquals(kernelWorld!.slug, "kernel");
    });

    await t.step("kernel world bootstrapping with API key", async () => {
      // Check if the organization and API key triples were created
      const result = await worlds.sparql({
        world: KERNEL_WORLD_ID,
        query: `
          PREFIX worlds: <${KERNEL.NAMESPACE}>
          SELECT ?org ?key WHERE {
            ?org a <${KERNEL.Organization}> .
            ?key a <${KERNEL.ApiKey}> ;
                 <${KERNEL.belongsTo}> ?org ;
                 <${KERNEL.hasSecret}> "${apiKey}" .
          }
        `,
      }) as SparqlSelectResults;

      assertExists(result.results.bindings[0]);
      assertEquals(result.results.bindings[0].org.value, orgId);
    });

    await t.step("kernel world is protected from normal listings", async () => {
      // Create a normal world
      await worlds.create({ slug: "normal-world", label: "Normal" });

      const list = await worlds.list();
      // Kernel world should be in the list for now (Phase 3 will add scoping)
      assertExists(list.find((w) => w.id === KERNEL_WORLD_ID));
    });
  } finally {
    // Cleanup the entire engine to avoid leaking background promises/connections
    await worlds.close();
    // Close the manager for temporary databases
    await appContext.libsql.manager.close();
    // Close the core repository client
    appContext.libsql.database.close();
  }
});
