import { assertEquals, assertExists } from "@std/assert";
import { createTestContext } from "./engine-context.ts";
import { LocalWorlds } from "./local.ts";
import { KERNEL, KERNEL_WORLD_ID } from "./ontology.ts";
import type { SparqlSelectResults } from "./schemas/mod.ts";

Deno.test("LocalWorlds Kernel", async (t) => {
  const apiKey = "test-api-key";
  const namespaceId = "https://wazoo.dev/kernel/namespaces/test-ns";

  await using appContext = await createTestContext();
  appContext.apiKey = apiKey;
  appContext.namespaceId = namespaceId;

  await using worlds = new LocalWorlds(appContext);
  await worlds.init();

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
        SELECT ?ns ?key WHERE {
          ?ns a <${KERNEL.Namespace}> .
          ?key a <${KERNEL.ApiKey}> ;
               <${KERNEL.belongsTo}> ?ns ;
               <${KERNEL.hasSecret}> "${apiKey}" .
        }
      `,
    }) as SparqlSelectResults;

    assertExists(result.results.bindings[0]);
    assertEquals(result.results.bindings[0].ns.value, namespaceId);
  });

  await t.step("kernel world is protected from normal listings", async () => {
    // Create a normal world
    await worlds.create({ slug: "normal-world", label: "Normal" });

    const list = await worlds.list();
    // Kernel world should NOT be in the list for a non-root namespace
    assertEquals(list.find((w) => w.id === KERNEL_WORLD_ID), undefined);
  });
});
