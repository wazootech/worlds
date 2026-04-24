import { assertEquals, assertExists, assertRejects } from "@std/assert";
import type { SparqlSelectResult, World } from "../schema.ts";
import { EmbeddedWorlds } from "./service.ts";
import { ApiKeyRepository } from "../management/keys.ts";
import { NamespaceRepository } from "../management/namespaces.ts";
import { WorldRepository } from "../management/worlds.ts";
import { KvStoreEngine } from "../infrastructure/store.ts";

Deno.test({
  name: "EmbeddedWorlds (Shell Architecture)",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    const keys = new ApiKeyRepository();
    const namespaces = new NamespaceRepository();
    const worldsRepo = new WorldRepository();
    const storage = new KvStoreEngine();
    const namespaceId = "test-ns";

    await namespaces.insert({
      id: namespaceId,
      label: "Test Namespace",
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    const worlds = new EmbeddedWorlds({
      management: { keys, namespaces, worlds: worldsRepo },
      storage,
      namespace: namespaceId,
    });

    await worlds.init();

    let worldId: string;

    await t.step("createWorld world", async () => {
      const world = await worlds.createWorld({
        id: "core-world",
        displayName: "Core World",
        description: "Test World from Core",
      });
      assertExists(world.id);
      assertEquals(world.displayName, "Core World");
      worldId = world.id!;
    });

    await t.step("getWorld world", async () => {
      const world = await worlds.getWorld({ source: worldId });
      assertExists(world);
      assertEquals(world!.displayName, "Core World");
    });

    await t.step("listWorlds worlds", async () => {
      const list = await worlds.listWorlds({ pageSize: 10 });
      const found = list.worlds.find((w: World) => w.id === worldId);
      assertExists(found);
    });

    await t.step("updateWorld world", async () => {
      await worlds.updateWorld({
        source: worldId,
        description: "Updated from Core",
      });
      const world = await worlds.getWorld({ source: worldId });
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
        const selectResult = result as SparqlSelectResult;
        assertEquals(
          selectResult.results.bindings[0].o.value,
          "Core Value",
        );
      } else {
        throw new Error("Expected SELECT result");
      }
    });

    await t.step("deleteWorld world", async () => {
      await worlds.deleteWorld({ source: worldId });
      const world = await worlds.getWorld({ source: worldId });
      assertEquals(world, null);
    });

    await worlds[Symbol.asyncDispose]();
    await storage.close();
  },
});

Deno.test({
  name: "EmbeddedWorlds throws when search called without SearchEngine",
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

    const worldsNoSearch = new EmbeddedWorlds({
      management: {
        keys,
        namespaces,
        worlds: worldsRepo,
      },
      namespace: namespaceId,
      storage: storage,
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