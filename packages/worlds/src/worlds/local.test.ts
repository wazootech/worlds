import { assertEquals, assertExists } from "@std/assert";
import type { SparqlSelectResults } from "#/schemas/mod.ts";
import { createTestContext } from "#/core/engine-context.ts";
import { LocalWorlds } from "#/worlds/local.ts";

Deno.test("LocalWorlds", async (t) => {
  await using appContext = await createTestContext();
  await using worlds = new LocalWorlds(appContext);
  await worlds.init();

  let id: string;

  await t.step("create world", async () => {
    const world = await worlds.create({
      slug: "core-world",
      label: "Core World",
      description: "Test World from Core",
    });
    assertExists(world.id);
    assertEquals(world.label, "Core World");
    id = world.id;
  });

  await t.step("get world", async () => {
    const world = await worlds.get({ world: id });
    assertExists(world);
    assertEquals(world!.label, "Core World");
  });

  await t.step("list worlds", async () => {
    const list = await worlds.list({ page: 1, pageSize: 10 });
    assertExists(list.find((w) => w.id === id));
  });

  await t.step("update world", async () => {
    await worlds.update({
      world: id,
      description: "Updated from Core",
    });
    const world = await worlds.get({ world: id });
    assertEquals(world!.description, "Updated from Core");
  });

  await t.step("sparql query/update", async () => {
    // Insert
    await worlds.sparql({
      world: id,
      query: `
      INSERT DATA { <http://example.org/s> <http://example.org/p> "Core Value" . }
    `,
    });

    // Query
    const result = await worlds.sparql({
      world: id,
      query: `
      SELECT ?o WHERE { <http://example.org/s> <http://example.org/p> ?o }
    `,
    });

    // Type check if it's select result
    if (result && "results" in result) {
      const selectResult = result as SparqlSelectResults;
      assertEquals(
        selectResult.results.bindings[0].o.value,
        "Core Value",
      );
    } else {
      throw new Error("Expected SELECT result");
    }
  });

  await t.step("delete world", async () => {
    await worlds.delete({ world: id });
    const world = await worlds.get({ world: id });
    assertEquals(world, null);
  });
});

