import { assertEquals } from "@std/assert";
import { LocalWorlds } from "#/worlds/local.ts";
import { createTestContext } from "#/core/engine-context.ts";
import { WORLDS, WORLDS_WORLD_SLUG } from "#/core/ontology.ts";
import type { SparqlSelectResults } from "#/schemas/mod.ts";

Deno.test({
  name: "Multi-tenant Isolation",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    await using appContext = await createTestContext();

    // Seed two namespaces in the registry world
    {
      const engine = new LocalWorlds(appContext);
      await engine.init();

      await engine.sparql({
        slug: WORLDS_WORLD_SLUG,
        query: `
        PREFIX registry: <${WORLDS.NAMESPACE}>
        INSERT DATA {
          <https://wazoo.dev/registry/namespaces/ns-a> a <${WORLDS.Namespace}> ;
            <${WORLDS.hasLabel}> "NS A" .
          <https://wazoo.dev/registry/namespaces/ns-b> a <${WORLDS.Namespace}> ;
            <${WORLDS.hasLabel}> "NS B" .
        }
      `,
      });
    }

    // Create context for NS A
    const ctxA = {
      ...appContext,
      namespace: "https://wazoo.dev/registry/namespaces/ns-a",
    };
    await using worldsA = new LocalWorlds(ctxA);
    await worldsA.init();

    // Create context for NS B
    const ctxB = {
      ...appContext,
      namespace: "https://wazoo.dev/registry/namespaces/ns-b",
    };
    await using worldsB = new LocalWorlds(ctxB);
    await worldsB.init();

    const sharedSlug = "shared-slug";

    await t.step("NS A can create and see its own world", async () => {
      const world = await worldsA.create({
        slug: sharedSlug,
        label: "World A",
      });
      assertEquals(world.slug, sharedSlug);

      const list = await worldsA.list();
      assertEquals(list.some((world) => world.slug === sharedSlug), true);
    });

    await t.step("NS B cannot see NS A's world in list", async () => {
      const list = await worldsB.list();
      assertEquals(list.some((world) => world.slug === sharedSlug), false);
    });

    await t.step("NS B cannot get NS A's world by slug", async () => {
      const world = await worldsB.get({ slug: sharedSlug });
      assertEquals(world, null);
    });

    await t.step("NS B can use the same slug in its own scope", async () => {
      const world = await worldsB.create({
        slug: sharedSlug,
        label: "World B",
      });
      assertEquals(world.slug, sharedSlug);
      assertEquals(world.slug, sharedSlug);

      const worldB = await worldsB.get({ slug: sharedSlug });
      assertEquals(worldB?.label, "World B");

      const worldA = await worldsA.get({ slug: sharedSlug });
      assertEquals(worldA?.label, "World A");
    });

    await t.step("Data isolation between worlds with same slug", async () => {
      // Insert into A
      await worldsA.sparql({
        slug: sharedSlug,
        query:
          `INSERT DATA { <http://example.org/s> <http://example.org/p> "Value A" . }`,
      });

      // Insert into B
      await worldsB.sparql({
        slug: sharedSlug,
        query:
          `INSERT DATA { <http://example.org/s> <http://example.org/p> "Value B" . }`,
      });

      // Check A
      const resA = await worldsA.sparql({
        slug: sharedSlug,
        query:
          `SELECT ?o WHERE { <http://example.org/s> <http://example.org/p> ?o }`,
      }) as SparqlSelectResults;
      assertEquals(resA.results.bindings[0].o.value, "Value A");

      // Check B
      const resB = await worldsB.sparql({
        slug: sharedSlug,
        query:
          `SELECT ?o WHERE { <http://example.org/s> <http://example.org/p> ?o }`,
      }) as SparqlSelectResults;
      assertEquals(resB.results.bindings[0].o.value, "Value B");
    });
  },
});
