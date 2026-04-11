import { assertEquals, assertExists } from "@std/assert";
import { createTestContext } from "#/core/engine-context.ts";
import { LocalWorlds } from "#/worlds/local.ts";
import { REGISTRY, REGISTRY_WORLD_ID } from "#/core/ontology.ts";
import type { SparqlSelectResults } from "#/schemas/mod.ts";

Deno.test("LocalWorlds Registry", async (t) => {
  const apiKey = "test-api-key";
  const namespaceId = "https://wazoo.dev/registry/namespaces/test-ns";

  await using appContext = await createTestContext();
  appContext.apiKey = apiKey;
  appContext.namespaceId = namespaceId;

  await using worlds = new LocalWorlds(appContext);
  await worlds.init();

  await t.step("registry world auto-initialization", async () => {
    // Calling any method should trigger the initialization
    const registryWorld = await worlds.get({ world: REGISTRY_WORLD_ID });
    assertExists(registryWorld);
    assertEquals(registryWorld!.slug, "registry");
  });

  await t.step("registry world bootstrapping with API key", async () => {
    // Check if the organization and API key triples were created
    const result = await worlds.sparql({
      world: REGISTRY_WORLD_ID,
      query: `
        PREFIX registry: <${REGISTRY.NAMESPACE}>
        SELECT ?ns ?key WHERE {
          ?ns a <${REGISTRY.Namespace}> .
          ?key a <${REGISTRY.ApiKey}> ;
               <${REGISTRY.belongsTo}> ?ns ;
               <${REGISTRY.hasSecret}> "${apiKey}" .
        }
      `,
    }) as SparqlSelectResults;

    assertExists(result.results.bindings[0]);
    assertEquals(result.results.bindings[0].ns.value, namespaceId);
  });

  await t.step("registry world is protected from normal listings", async () => {
    // Create a normal world
    await worlds.create({ slug: "normal-world", label: "Normal" });

    const list = await worlds.list();
    // Registry world should NOT be in the list for a non-root namespace
    assertEquals(list.find((w) => w.slug === REGISTRY_WORLD_ID), undefined);
  });
});

