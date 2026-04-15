import { assertEquals, assertRejects } from "@std/assert";
import { LocalWorlds } from "#/worlds/local.ts";
import { createTestContext } from "#/core/engine-context.ts";
import { WORLDS_WORLD_SLUG } from "#/core/ontology.ts";
import type { SparqlSelectResults } from "#/schemas/mod.ts";
import { NamespacesRepository } from "#/plugins/registry/namespaces.repository.ts";

Deno.test({
  name: "Multi-tenant Isolation",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    await using appContext = await createTestContext();

    const namespacesRepo = new NamespacesRepository(appContext.libsql.database);
    const now = Date.now();

    // Seed two namespaces in the registry
    await namespacesRepo.insert({
      id: "https://wazoo.dev/registry/namespaces/ns-a",
      label: "NS A",
      created_at: now,
      updated_at: now,
    });
    await namespacesRepo.insert({
      id: "https://wazoo.dev/registry/namespaces/ns-b",
      label: "NS B",
      created_at: now,
      updated_at: now,
    });

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

    const sharedWorld = "shared-world";

    await t.step("NS A can create and see its own world", async () => {
      const world = await worldsA.create({
        world: sharedWorld,
        label: "World A",
      });
      assertEquals(world.world, sharedWorld);

      const list = await worldsA.list();
      assertEquals(list.some((world) => world.world === sharedWorld), true);
    });

    await t.step("NS B cannot see NS A's world in list", async () => {
      const list = await worldsB.list();
      assertEquals(list.some((world) => world.world === sharedWorld), false);
    });

    await t.step("NS B cannot get NS A's world by world", async () => {
      const world = await worldsB.get({ source: sharedWorld });
      assertEquals(world, null);
    });

    await t.step("NS B can use the same world in its own scope", async () => {
      const world = await worldsB.create({
        world: sharedWorld,
        label: "World B",
      });
      assertEquals(world.world, sharedWorld);
      assertEquals(world.world, sharedWorld);

      const worldB = await worldsB.get({ source: sharedWorld });
      assertEquals(worldB?.label, "World B");

      const worldA = await worldsA.get({ source: sharedWorld });
      assertEquals(worldA?.label, "World A");
    });

    await t.step("Data isolation between worlds with same world", async () => {
      // Insert into A
      await worldsA.sparql({
        sources: [sharedWorld],
        query:
          `INSERT DATA { <http://example.org/s> <http://example.org/p> "Value A" . }`,
      });

      // Insert into B
      await worldsB.sparql({
        sources: [sharedWorld],
        query:
          `INSERT DATA { <http://example.org/s> <http://example.org/p> "Value B" . }`,
      });

      // Check A
      const resA = await worldsA.sparql({
        sources: [sharedWorld],
        query:
          `SELECT ?o WHERE { <http://example.org/s> <http://example.org/p> ?o }`,
      }) as SparqlSelectResults;
      assertEquals(resA.results.bindings[0].o.value, "Value A");

      // Check B
      const resB = await worldsB.sparql({
        sources: [sharedWorld],
        query:
          `SELECT ?o WHERE { <http://example.org/s> <http://example.org/p> ?o }`,
      }) as SparqlSelectResults;
      assertEquals(resB.results.bindings[0].o.value, "Value B");
    });

    await t.step(
      "NS B cannot access NS A's world using explicit namespace",
      async () => {
        // NS B tries to get NS A's world explicitly
        await assertRejects(
          () =>
            worldsB.get({
              source: { world: sharedWorld, namespace: ctxA.namespace },
            }),
          Error,
          "Unauthorized access to namespace",
        );

        // NS B tries to SPARQL into NS A's world explicitly
        await assertRejects(
          () =>
            worldsB.sparql({
              sources: [{ world: sharedWorld, namespace: ctxA.namespace }],
              query: "SELECT ?s WHERE { ?s ?p ?o }",
            }),
          Error,
          "Unauthorized access to namespace",
        );
      },
    );

    await t.step("Non-admin cannot access registry world", async () => {
      await assertRejects(
        () => worldsA.get({ source: WORLDS_WORLD_SLUG }),
        Error,
        "Unauthorized access to the registry world",
      );

      await assertRejects(
        () =>
          worldsA.sparql({
            sources: [WORLDS_WORLD_SLUG],
            query: "SELECT ?s WHERE { ?s ?p ?o }",
          }),
        Error,
        "Unauthorized access to the registry world",
      );
    });
  },
});