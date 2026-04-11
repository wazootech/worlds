import { assertEquals, assertExists } from "@std/assert";
import { createTestContext } from "#/core/engine-context.ts";
import { LocalWorlds } from "#/worlds/local.ts";
import { WORLDS, WORLDS_WORLD_SLUG } from "#/core/ontology.ts";
import type { SparqlSelectResults } from "#/schemas/mod.ts";

Deno.test("LocalWorlds Registry", async (t) => {
  const apiKey = "test-api-key";

  await using appContext = await createTestContext();
  appContext.apiKey = apiKey;

  await using worlds = new LocalWorlds(appContext);
  await worlds.init();

  await t.step("registry world auto-initialization", async () => {
    const worldsWorld = await worlds.get({ slug: WORLDS_WORLD_SLUG });
    assertExists(worldsWorld);
    assertEquals(worldsWorld!.slug, "worlds");
  });

  await t.step("registry world bootstrapping with API key", async () => {
    const namespace = "https://wazoo.dev/worlds/namespaces/default";
    const result = await worlds.sparql({
      slug: WORLDS_WORLD_SLUG,
      query: `
        PREFIX registry: <${WORLDS.NAMESPACE}>
        SELECT ?ns ?key WHERE {
          ?ns a <${WORLDS.Namespace}> .
          ?key a <${WORLDS.ApiKey}> ;
               <${WORLDS.belongsTo}> ?ns ;
               <${WORLDS.hasSecret}> "${apiKey}" .
        }
      `,
    }) as SparqlSelectResults;

    assertExists(result.results.bindings[0]);
    assertEquals(result.results.bindings[0].ns.value, namespace);
  });

  await t.step("registry world is protected from normal listings", async () => {
    await worlds.create({ slug: "normal-world", label: "Normal" });

    const list = await worlds.list();
    assertEquals(
      list.find((world) => world.slug === WORLDS_WORLD_SLUG),
      undefined,
    );
  });
});
