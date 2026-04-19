import { assertEquals } from "@std/assert";
import { DataFactory } from "n3";
import { KvStoreEngine } from "./engines/store.ts";

const { namedNode, literal, quad } = DataFactory;

Deno.test("KvStoreEngine", async (t) => {
  const manager = new KvStoreEngine();

  await t.step("getStore creates new store", async () => {
    await manager.getStore("world-1", "ns-1");

    const exists = await manager.getStore("world-1", "ns-1");
    assertEquals(exists !== null, true);
  });

  await t.step("getStore returns existing store", async () => {
    const store1 = await manager.getStore("world-2", "ns-1");
    const store2 = await manager.getStore("world-2", "ns-1");

    assertEquals(store1 === store2, true);
  });

  await t.step("getStore creates new store if not exists", async () => {
    const store = await manager.getStore("world-new", "ns-new");

    assertEquals(store !== null, true);
    assertEquals(store.getQuads(null, null, null, null).length, 0);
  });

  await t.step("delete removes store", async () => {
    await manager.getStore("world-to-delete", "ns-1");

    manager.delete("world-to-delete", "ns-1");

    const store = await manager.getStore("world-to-delete", "ns-1");
    assertEquals(store.getQuads(null, null, null, null).length, 0);
  });

  await t.step("per-world isolation via namespace/id key", async () => {
    const store1 = await manager.getStore("world-a", "ns-a");
    const store2 = await manager.getStore("world-b", "ns-b");

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

    const retrieved1 = await manager.getStore("world-a", "ns-a");
    const retrieved2 = await manager.getStore("world-b", "ns-b");

    assertEquals(retrieved1.getQuads(null, null, null, null).length, 1);
    assertEquals(retrieved2.getQuads(null, null, null, null).length, 1);

    const obj1 = retrieved1.getQuads(null, null, null, null)[0].object.value;
    const obj2 = retrieved2.getQuads(null, null, null, null)[0].object.value;

    assertEquals(obj1, "World A");
    assertEquals(obj2, "World B");
  });

  await t.step("close clears all stores", async () => {
    await manager.getStore("world-x", "ns-1");

    manager.close();

    const store = await manager.getStore("world-x", "ns-1");
    assertEquals(store.getQuads(null, null, null, null).length, 0);
  });

  await t.step("Symbol.asyncDispose closes storage", async () => {
    const mgr = new KvStoreEngine();
    await mgr.getStore("test", "ns");

    await mgr[Symbol.asyncDispose]();

    const store = await mgr.getStore("test", "ns");
    assertEquals(store.getQuads(null, null, null, null).length, 0);
  });
});
