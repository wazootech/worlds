import { assertEquals } from "@std/assert";
import { DataFactory, Store } from "n3";
import { MemoryWorldsStorageManager } from "./storage.ts";

const { namedNode, literal, quad } = DataFactory;

Deno.test("MemoryWorldsStorageManager", async (t) => {
  const manager = new MemoryWorldsStorageManager();

  await t.step("create creates new store", async () => {
    const storage = await manager.create({ id: "world-1", namespace: "ns-1" });
    
    const exists = await manager.get({ id: "world-1", namespace: "ns-1" });
    assertEquals(exists !== null, true);
  });

  await t.step("get returns existing store", async () => {
    await manager.create({ id: "world-2", namespace: "ns-1" });
    
    const storage1 = await manager.get({ id: "world-2", namespace: "ns-1" });
    const storage2 = await manager.get({ id: "world-2", namespace: "ns-1" });
    
    // Should return same store instance for same key
    assertEquals(storage1.store === storage2.store, true);
  });

  await t.step("get creates new store if not exists", async () => {
    const storage = await manager.get({ id: "world-new", namespace: "ns-new" });
    
    assertEquals(storage !== null, true);
    assertEquals(storage.store.getQuads(null, null, null, null).length, 0);
  });

  await t.step("delete removes store", async () => {
    await manager.create({ id: "world-to-delete", namespace: "ns-1" });
    
    await manager.delete({ id: "world-to-delete", namespace: "ns-1" });
    
    // After delete, get should create a new empty store
    const storage = await manager.get({ id: "world-to-delete", namespace: "ns-1" });
    assertEquals(storage.store.getQuads(null, null, null, null).length, 0);
  });

  await t.step("per-world isolation via namespace/id key", async () => {
    const storage1 = await manager.create({ id: "world-a", namespace: "ns-a" });
    const storage2 = await manager.create({ id: "world-b", namespace: "ns-b" });
    
    storage1.store.addQuad(
      quad(
        namedNode("http://example.org/s"),
        namedNode("http://example.org/p"),
        literal("World A"),
      ),
    );
    
    storage2.store.addQuad(
      quad(
        namedNode("http://example.org/s"),
        namedNode("http://example.org/p"),
        literal("World B"),
      ),
    );
    
    const retrieved1 = await manager.get({ id: "world-a", namespace: "ns-a" });
    const retrieved2 = await manager.get({ id: "world-b", namespace: "ns-b" });
    
    assertEquals(retrieved1.store.getQuads(null, null, null, null).length, 1);
    assertEquals(retrieved2.store.getQuads(null, null, null, null).length, 1);
    
    const obj1 = retrieved1.store.getQuads(null, null, null, null)[0].object.value;
    const obj2 = retrieved2.store.getQuads(null, null, null, null)[0].object.value;
    
    assertEquals(obj1, "World A");
    assertEquals(obj2, "World B");
  });

  await t.step("close clears all stores", async () => {
    await manager.create({ id: "world-x", namespace: "ns-1" });
    
    await manager.close();
    
    // After close, get should create new empty store
    const storage = await manager.get({ id: "world-x", namespace: "ns-1" });
    assertEquals(storage.store.getQuads(null, null, null, null).length, 0);
  });

  await t.step("Symbol.asyncDispose closes storage", async () => {
    const mgr = new MemoryWorldsStorageManager();
    await mgr.create({ id: "test", namespace: "ns" });
    
    await mgr[Symbol.asyncDispose]();
    
    const storage = await mgr.get({ id: "test", namespace: "ns" });
    assertEquals(storage.store.getQuads(null, null, null, null).length, 0);
  });
});
