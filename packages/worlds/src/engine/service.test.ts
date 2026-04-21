import { assertEquals, assertExists, assertRejects } from "@std/assert";
import type { SparqlSelectResults } from "../schema.ts";
import { createTestContext } from "../testing/context.ts";
import { Worlds } from "./service.ts";
import { ApiKeyRepository } from "../management/keys.ts";
import { NamespaceRepository } from "../management/namespaces.ts";
import { WorldRepository } from "../management/worlds.ts";
import { KvStoreEngine } from "../infrastructure/store.ts";

Deno.test({
  name: "Worlds Engine (Shell Architecture)",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    await using context = await createTestContext();

    // Wire up a Managed Shell engine for testing
    const worlds = new Worlds({
      storeEngine: context.storage,
      embeddings: context.embeddings,
      management: context.management,
      namespace: context.namespace,
      id: context.id,
    });

    await worlds.init();

    let worldId: string;

    await t.step("create world", async () => {
      const world = await worlds.create({
        name: "core-world",
        displayName: "Core World",
        description: "Test World from Core",
      });
      assertExists(world.id);
      assertEquals(world.displayName, "Core World");
      worldId = world.id!;
    });

    await t.step("get world", async () => {
      const world = await worlds.get({ source: worldId });
      assertExists(world);
      assertEquals(world!.displayName, "Core World");
    });

    await t.step("list worlds", async () => {
      const list = await worlds.list({ pageSize: 10 });
      const found = list.worlds.find((w: any) => w.id === worldId);
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

Deno.test({
  name: "Worlds throws when search called without SearchEngine",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const keys = new ApiKeyRepository();
    const namespaces = new NamespaceRepository();
    const worldsRepo = new WorldRepository();
    const storage = new KvStoreEngine();
    const namespaceId = "test-admin";

    await namespaces.insert({
      id: namespaceId,
      label: "Test Admin",
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    const worldsNoSearch = new Worlds({
      management: {
        keys,
        namespaces,
        worlds: worldsRepo,
      },
      namespace: namespaceId,
      storeEngine: storage,
      id: "test-world",
    });

    await worldsNoSearch.init();

    await assertRejects(
      () => worldsNoSearch.search({ query: "test" }),
      Error,
      "SearchEngine is required for search operations",
    );

    await storage.close();
  },
});
