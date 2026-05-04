import { assertEquals, assertExists } from "@std/assert";
import { ApiKeyRepository } from "./keys.ts";
import { NamespaceRepository } from "./namespaces.ts";
import { WorldRepository } from "./worlds.ts";

Deno.test("ApiKeyRepository", async (t) => {
  const repo = new ApiKeyRepository();

  await t.step("create stores key with namespace", async () => {
    await repo.create("test-api-key", "test-namespace");

    const resolved = await repo.resolve("test-api-key");
    assertExists(resolved);
    assertEquals(resolved!.namespace, "test-namespace");
    assertEquals(resolved!.worldId, undefined);
  });

  await t.step("create stores key with worldId", async () => {
    await repo.create("world-scoped-key", undefined, "test-world");

    const resolved = await repo.resolve("world-scoped-key");
    assertExists(resolved);
    assertEquals(resolved!.namespace, undefined);
    assertEquals(resolved!.worldId, "test-world");
  });

  await t.step("resolve returns null for unknown key", async () => {
    const resolved = await repo.resolve("unknown-key");
    assertEquals(resolved, null);
  });

  await t.step("delete removes key", async () => {
    await repo.create("key-to-delete", "ns");
    await repo.delete("key-to-delete");
    const resolved = await repo.resolve("key-to-delete");
    assertEquals(resolved, null);
  });
});

Deno.test("NamespaceRepository", async (t) => {
  const repo = new NamespaceRepository();
  const now = Date.now();

  await t.step("insert adds namespace", async () => {
    await repo.insert({
      id: "ns-1",
      label: "Namespace 1",
      created_at: now,
      updated_at: now,
    });

    const ns = await repo.get("ns-1");
    assertExists(ns);
    assertEquals(ns!.label, "Namespace 1");
  });

  await t.step("get returns null for unknown", async () => {
    const ns = await repo.get("unknown");
    assertEquals(ns, null);
  });

  await t.step("list returns all namespaces", async () => {
    await repo.insert({
      id: "ns-2",
      label: "Namespace 2",
      created_at: now,
      updated_at: now,
    });

    const result = await repo.list({});
    assertEquals(result.namespaces.length, 2);
  });

  await t.step("update modifies namespace", async () => {
    await repo.update("ns-1", { label: "Updated Label" });

    const ns = await repo.get("ns-1");
    assertEquals(ns!.label, "Updated Label");
  });

  await t.step("delete removes namespace", async () => {
    await repo.delete("ns-1");

    const ns = await repo.get("ns-1");
    assertEquals(ns, null);
  });
});

Deno.test("WorldRepository", async (t) => {
  const repo = new WorldRepository();
  const now = Date.now();

  await t.step("insert adds world", async () => {
    await repo.insert({
      id: "world-1",
      namespace: "ns-1",
      label: "World 1",
      description: "Test World",
      connection_uri: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    const world = await repo.get("world-1", "ns-1");
    assertExists(world);
    assertEquals(world!.label, "World 1");
  });

  await t.step("get returns null for unknown", async () => {
    const world = await repo.get("unknown", "ns-1");
    assertEquals(world, null);
  });

  await t.step("list returns filtered worlds", async () => {
    await repo.insert({
      id: "world-2",
      namespace: "ns-1",
      label: "World 2",
      connection_uri: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    const result = await repo.list({ namespace: "ns-1" });
    assertEquals(result.worlds.length, 2);
  });

  await t.step("list excludes deleted worlds", async () => {
    await repo.insert({
      id: "world-3",
      namespace: "ns-2",
      label: "World 3",
      connection_uri: null,
      created_at: now,
      updated_at: now,
      deleted_at: now, // Marked as deleted
    });

    const result = await repo.list({ namespace: "ns-2" });
    assertEquals(result.worlds.length, 0);
  });

  await t.step("update modifies world", async () => {
    await repo.update("world-1", "ns-1", { label: "Updated World" });

    const world = await repo.get("world-1", "ns-1");
    assertEquals(world!.label, "Updated World");
  });

  await t.step("delete removes world", async () => {
    await repo.delete("world-1", "ns-1");

    const world = await repo.get("world-1", "ns-1");
    assertEquals(world, null);
  });

  await t.step("getInternal finds by id", async () => {
    await repo.insert({
      id: "world-internal",
      namespace: "ns-internal",
      label: "Internal",
      connection_uri: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    const world = await repo.getInternal("world-internal");
    assertExists(world);
    assertEquals(world!.id, "world-internal");
  });
});
