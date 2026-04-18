import { assertEquals } from "@std/assert";
import { DataFactory } from "n3";
import { MemoryStoreManager } from "./storage.ts";

const { namedNode, literal, quad } = DataFactory;

Deno.test("MemoryStoreManager", async (t) => {
  const manager = new MemoryStoreManager();

  await t.step("create creates new store", async () => {
    const _store = await manager.create({ id: "world-1", namespace: "ns-1" });

    const exists = await manager.get({ id: "world-1", namespace: "ns-1" });
    assertEquals(exists !== null, true);
  });

  await t.step("get returns existing store", async () => {
    await manager.create({ id: "world-2", namespace: "ns-1" });

    const store1 = await manager.get({ id: "world-2", namespace: "ns-1" });
    const store2 = await manager.get({ id: "world-2", namespace: "ns-1" });

    // Should return same store instance for same key
    assertEquals(store1 === store2, true);
  });

  await t.step("get creates new store if not exists", async () => {
    const store = await manager.get({ id: "world-new", namespace: "ns-new" });

    assertEquals(store !== null, true);
    assertEquals(store.getQuads(null, null, null, null).length, 0);
  });

  await t.step("delete removes store", async () => {
    await manager.create({ id: "world-to-delete", namespace: "ns-1" });

    await manager.delete({ id: "world-to-delete", namespace: "ns-1" });

    // After delete, get should create a new empty store
    const store = await manager.get({
      id: "world-to-delete",
      namespace: "ns-1",
    });
    assertEquals(store.getQuads(null, null, null, null).length, 0);
  });

  await t.step("per-world isolation via namespace/id key", async () => {
    const store1 = await manager.create({ id: "world-a", namespace: "ns-a" });
    const store2 = await manager.create({ id: "world-b", namespace: "ns-b" });

    store1.addQuad(
      quad(
        namedNode("http://example.org/s"),
        namedNode("http://example.org/p"),
        literal("World A"),
      ),
    );

    store2.addQuad(
      quad(
        namedNode("http://example.org/s"),
        namedNode("http://example.org/p"),
        literal("World B"),
      ),
    );

    const retrieved1 = await manager.get({ id: "world-a", namespace: "ns-a" });
    const retrieved2 = await manager.get({ id: "world-b", namespace: "ns-b" });

    assertEquals(retrieved1.getQuads(null, null, null, null).length, 1);
    assertEquals(retrieved2.getQuads(null, null, null, null).length, 1);

    const obj1 = retrieved1.getQuads(null, null, null, null)[0].object.value;
    const obj2 = retrieved2.getQuads(null, null, null, null)[0].object.value;

    assertEquals(obj1, "World A");
    assertEquals(obj2, "World B");
  });

  await t.step("close clears all stores", async () => {
    await manager.create({ id: "world-x", namespace: "ns-1" });

    await manager.close();

    // After close, get should create new empty store
    const store = await manager.get({ id: "world-x", namespace: "ns-1" });
    assertEquals(store.getQuads(null, null, null, null).length, 0);
  });

  await t.step("Symbol.asyncDispose closes storage", async () => {
    const mgr = new MemoryStoreManager();
    await mgr.create({ id: "test", namespace: "ns" });

    await mgr[Symbol.asyncDispose]();

    const store = await mgr.get({ id: "test", namespace: "ns" });
    assertEquals(store.getQuads(null, null, null, null).length, 0);
  });
});
