import { assert, assertEquals } from "@std/assert";
import { Store } from "oxigraph";
import { DenoKvOxigraphService } from "./deno-kv-oxigraph-service.ts";

Deno.test("DenoKvOxigraphService.addStore adds quads to existing store", async () => {
  const kv = await Deno.openKv(":memory:");
  const service = new DenoKvOxigraphService(kv);
  const id = "test-store";
  const owner = "test-owner";

  // Initial store with one quad
  const store1 = new Store();
  store1.load('<http://example.com/s1> <http://example.com/p> "o1" .', {
    format: "application/n-quads",
  });
  await service.setStore(id, owner, store1);

  // Add another quad
  const store2 = new Store();
  store2.load('<http://example.com/s2> <http://example.com/p> "o2" .', {
    format: "application/n-quads",
  });
  await service.addQuads(id, owner, store2.match());

  // Verify result
  const resultStore = await service.getStore(id);
  assert(resultStore);
  assertEquals(resultStore.size, 2);

  const quads = resultStore.match();
  let count = 0;
  for (const _q of quads) count++;
  assertEquals(count, 2);

  kv.close();
});

Deno.test("DenoKvOxigraphService.addStore creates new store if not exists", async () => {
  const kv = await Deno.openKv(":memory:");
  const service = new DenoKvOxigraphService(kv);
  const id = "new-store";

  const store = new Store();
  store.load('<http://example.com/s> <http://example.com/p> "o" .', {
    format: "application/n-quads",
  });

  await service.addQuads(id, "new-owner", store.match());

  const resultStore = await service.getStore(id);
  assert(resultStore);
  assertEquals(resultStore.size, 1);

  kv.close();
});

Deno.test("DenoKvOxigraphService preserves ownership on update", async () => {
  const kv = await Deno.openKv(":memory:");
  const service = new DenoKvOxigraphService(kv);
  const id = "ownership-test-store";
  const originalOwner = "original-creator";
  const secondUser = "second-user";

  // 1. Create store with original owner
  const store1 = new Store();
  store1.load('<http://example.com/s1> <http://example.com/p> "o1" .', {
    format: "application/n-quads",
  });
  await service.setStore(id, originalOwner, store1);

  // Check initial metadata
  let metadata = await service.getMetadata(id);
  assert(metadata);
  assertEquals(
    metadata.createdBy,
    originalOwner,
    "Initial owner should be original-creator",
  );

  // 2. Add quads with a DIFFERENT owner passed in
  const store2 = new Store();
  store2.load('<http://example.com/s2> <http://example.com/p> "o2" .', {
    format: "application/n-quads",
  });
  await service.addQuads(id, secondUser, store2.match());

  // Check metadata again
  metadata = await service.getMetadata(id);
  assert(metadata);

  assertEquals(
    metadata.createdBy,
    originalOwner,
    "Owner should NOT change to second-user after addQuads",
  );

  kv.close();
});
