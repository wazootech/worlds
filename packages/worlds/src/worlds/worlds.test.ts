import { assertEquals, assertExists } from "@std/assert";
import type { SparqlSelectResults } from "#/worlds/sparql.schema.ts";
import { createTestContext } from "#/engine-context.ts";
import { Worlds } from "#/worlds/worlds.ts";
import { createIndexedStore } from "#/rdf/patch/indexed-store.ts";
import { SearchIndexHandler } from "#/rdf/patch/rdf-patch.ts";

Deno.test({
  name: "Worlds Engine (Shell Architecture)",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    await using context = await createTestContext();

    // Wire up a Managed Shell engine for testing
    const worlds = new Worlds({
      management: context.management,
      namespace: context.namespace,
      resolver: async (id, ns) => {
        const rawStore = await context.storage.get({ id, namespace: ns });
        const { store, sync } = createIndexedStore(rawStore, [
          new SearchIndexHandler(id, context.vectors),
        ]);
        (store as any).sync = sync;
        return store;
      },
      world: context.world,
    });

    await worlds.init();

    let worldId: string;

    await t.step("create world", async () => {
      const world = await worlds.create({
        name: "core-world",
        label: "Core World",
        description: "Test World from Core",
      });
      assertExists(world.id);
      assertEquals(world.label, "Core World");
      worldId = world.id!;
    });

    await t.step("get world", async () => {
      const world = await worlds.get({ source: worldId });
      assertExists(world);
      assertEquals(world!.label, "Core World");
    });

    await t.step("list worlds", async () => {
      const list = await worlds.list({ pageSize: 10 });
      const found = list.find((w) => w.id === worldId);
      assertExists(found);
    });

    await t.step("update world", async () => {
      await worlds.update({
        source: worldId,
        description: "Updated from Core",
      });
      const world = await worlds.get({ source: worldId });
      assertEquals(world!.description, "Updated from Core");
    });

    await t.step("sparql query/update", async () => {
      await worlds.sparql({
        sources: [worldId],
        query: `
      INSERT DATA { <http://example.org/s> <http://example.org/p> "Core Value" . }
    `,
      });

      const result = await worlds.sparql({
        sources: [worldId],
        query: `
      SELECT ?o WHERE { <http://example.org/s> <http://example.org/p> ?o }
    `,
      });

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
      await worlds.delete({ source: worldId });
      const world = await worlds.get({ source: worldId });
      assertEquals(world, null);
    });
  },
});
