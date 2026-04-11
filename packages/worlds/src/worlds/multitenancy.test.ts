import { assertEquals } from "@std/assert";
import { LocalWorlds } from "#/worlds/local.ts";
import { createTestContext } from "#/core/engine-context.ts";
import { WORLDS, WORLDS_WORLD_ID } from "#/core/ontology.ts";
import type { SparqlSelectResults } from "#/schemas/mod.ts";

Deno.test("Multi-tenant Isolation", async (t) => {
  await using appContext = await createTestContext();

  // Seed two namespaces in the registry world
  {
    const engine = new LocalWorlds(appContext);
    await engine.init();

    await engine.sparql({
      world: WORLDS_WORLD_ID,
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
    namespaceId: "https://wazoo.dev/registry/namespaces/ns-a",
  };
  await using worldsA = new LocalWorlds(ctxA);
  await worldsA.init();

  // Create context for NS B
  const ctxB = {
    ...appContext,
    namespaceId: "https://wazoo.dev/registry/namespaces/ns-b",
  };
  await using worldsB = new LocalWorlds(ctxB);
  await worldsB.init();

  const sharedSlug = "shared-slug";

  await t.step("NS A can create and see its own world", async () => {
    const worldA = await worldsA.create({
      slug: sharedSlug,
      label: "World A",
    });
    assertEquals(worldA.id, sharedSlug);

    const list = await worldsA.list();
    assertEquals(list.some((w) => w.id === sharedSlug), true);
  });

  await t.step("NS B cannot see NS A's world in list", async () => {
    // Before B creates anything, its list should be empty
    const list = await worldsB.list();
    assertEquals(list.some((w) => w.id === sharedSlug), false);
  });

  await t.step("NS B cannot get NS A's world by slug", async () => {
    const world = await worldsB.get({ world: sharedSlug });
    assertEquals(world, null);
  });

  await t.step("NS B can use the same slug in its own scope", async () => {
    const worldB = await worldsB.create({
      slug: sharedSlug,
      label: "World B",
    });
    assertEquals(worldB.slug, sharedSlug);
    assertEquals(worldB.id, sharedSlug);

    // Verify B sees its own version
    const world = await worldsB.get({ world: sharedSlug });
    assertEquals(world?.label, "World B");

    // Verify A still sees its own version
    const worldA = await worldsA.get({ world: sharedSlug });
    assertEquals(worldA?.label, "World A");
  });

  await t.step("Data isolation between worlds with same slug", async () => {
    // Insert into A
    await worldsA.sparql({
      world: sharedSlug,
      query:
        `INSERT DATA { <http://example.org/s> <http://example.org/p> "Value A" . }`,
    });

    // Insert into B
    await worldsB.sparql({
      world: sharedSlug,
      query:
        `INSERT DATA { <http://example.org/s> <http://example.org/p> "Value B" . }`,
    });

    // Check A
    const resA = await worldsA.sparql({
      world: sharedSlug,
      query:
        `SELECT ?o WHERE { <http://example.org/s> <http://example.org/p> ?o }`,
    }) as SparqlSelectResults;
    assertEquals(resA.results.bindings[0].o.value, "Value A");

    // Check B
    const resB = await worldsB.sparql({
      world: sharedSlug,
      query:
        `SELECT ?o WHERE { <http://example.org/s> <http://example.org/p> ?o }`,
    }) as SparqlSelectResults;
    assertEquals(resB.results.bindings[0].o.value, "Value B");
  });
});

