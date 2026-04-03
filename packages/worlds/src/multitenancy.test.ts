import { assertEquals, assertRejects } from "@std/assert";
import { LocalWorlds } from "./local.ts";
import { createTestContext } from "./engine-context.ts";
import { KERNEL, KERNEL_WORLD_ID } from "./ontology.ts";

Deno.test("Multi-tenant Isolation", async (t) => {
  await using appContext = await createTestContext();

  // Seed two namespaces in the kernel world
  {
    const engine = new LocalWorlds(appContext);
    await engine.init();

    await engine.sparql({
      world: KERNEL_WORLD_ID,
      query: `
        PREFIX worlds: <${KERNEL.NAMESPACE}>
        INSERT DATA {
          <https://wazoo.dev/kernel/namespaces/ns-a> a <${KERNEL.Namespace}> ;
            <${KERNEL.hasLabel}> "NS A" .
          <https://wazoo.dev/kernel/namespaces/ns-b> a <${KERNEL.Namespace}> ;
            <${KERNEL.hasLabel}> "NS B" .
        }
      `,
    });
  }

  // Create context for NS A
  const ctxA = {
    ...appContext,
    namespaceId: "https://wazoo.dev/kernel/namespaces/ns-a",
  };
  await using worldsA = new LocalWorlds(ctxA);
  await worldsA.init();

  // Create context for NS B
  const ctxB = {
    ...appContext,
    namespaceId: "https://wazoo.dev/kernel/namespaces/ns-b",
  };
  await using worldsB = new LocalWorlds(ctxB);
  await worldsB.init();

  let worldAId: string;

  await t.step("NS A can create and see its own world", async () => {
    const worldA = await worldsA.create({
      slug: "shared-slug",
      label: "World A",
    });
    worldAId = worldA.id;

    const list = await worldsA.list();
    assertEquals(list.some((w) => w.id === worldAId), true);
  });

  await t.step("NS B cannot see NS A's world in list", async () => {
    const list = await worldsB.list();
    assertEquals(list.some((w) => w.id === worldAId), false);
  });

  await t.step("NS B cannot get NS A's world by ID", async () => {
    const world = await worldsB.get({ world: worldAId });
    assertEquals(world, null);
  });

  await t.step("NS B can use the same slug in its own scope", async () => {
    const worldB = await worldsB.create({
      slug: "shared-slug",
      label: "World B",
    });
    assertEquals(worldB.slug, "shared-slug");
    assertEquals(worldB.id !== worldAId, true);
  });

  await t.step("NS B cannot perform SPARQL on NS A's world", async () => {
    await assertRejects(
      () =>
        worldsB.sparql({
          world: worldAId,
          query: "SELECT * WHERE { ?s ?p ?o }",
        }),
      Error,
      "World not found",
    );
  });
});
