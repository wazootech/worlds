import { assertEquals } from "@std/assert";
import { EmbeddedWorlds } from "#/engine/service.ts";
import { KvStoreEngine } from "#/infrastructure/store.ts";
import { ApiKeyRepository } from "#/management/keys.ts";
import { NamespaceRepository } from "#/management/namespaces.ts";
import { WorldRepository } from "#/management/worlds.ts";

function createMockEmbeddings() {
  return {
    dimensions: 768,
    embed: (texts: string | string[]) => {
      if (Array.isArray(texts)) {
        return Promise.resolve(Array(texts.length).fill(Array(768).fill(1)));
      }
      return Promise.resolve(Array(768).fill(1));
    },
  };
}

Deno.test("EmbeddedWorlds Lifecycle", async (t) => {
  await t.step("multiple init() calls are safe", async () => {
    const keys = new ApiKeyRepository();
    const namespaces = new NamespaceRepository();
    const worldsRepo = new WorldRepository();
    const storage = new KvStoreEngine();

    await namespaces.insert({
      id: "test-ns",
      label: "Test",
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    const worlds = new EmbeddedWorlds({
      management: {
        keys,
        namespaces,
        worlds: worldsRepo,
      },
      storage,
      embeddings: createMockEmbeddings(),
      namespace: "test-ns",
    });

    await Promise.all([
      worlds.init(),
      worlds.init(),
      worlds.init(),
    ]);

    const list = await worlds.listWorlds();
    assertEquals(Array.isArray(list.worlds), true);

    await worlds[Symbol.asyncDispose]();
    await storage.close();
  });

  await t.step("cleanup multiple instances", async () => {
    const keys = new ApiKeyRepository();
    const namespaces = new NamespaceRepository();
    const worldsRepo = new WorldRepository();
    const storage = new KvStoreEngine();

    await namespaces.insert({
      id: "test-ns",
      label: "Test",
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    const w1 = new EmbeddedWorlds({
      management: {
        keys,
        namespaces,
        worlds: worldsRepo,
      },
      storage,
      embeddings: createMockEmbeddings(),
      namespace: "test-ns",
    });
    const w2 = new EmbeddedWorlds({
      management: {
        keys,
        namespaces,
        worlds: worldsRepo,
      },
      storage,
      embeddings: createMockEmbeddings(),
      namespace: "test-ns",
    });

    await w1.init();
    await w2.init();

    const l1 = await w1.listWorlds();
    const l2 = await w2.listWorlds();

    assertEquals(l1.worlds.length, l2.worlds.length);

    await w1[Symbol.asyncDispose]();
    await w2[Symbol.asyncDispose]();
    await storage.close();
  });
});
