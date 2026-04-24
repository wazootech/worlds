import { assertEquals, assertExists } from "@std/assert";
import { EmbeddedWorlds, Worlds } from "./service.ts";
import { ApiKeyRepository } from "../management/keys.ts";
import { NamespaceRepository } from "../management/namespaces.ts";
import { WorldRepository } from "../management/worlds.ts";
import { KvStoreEngine } from "../infrastructure/store.ts";

Deno.test("Worlds with direct injection - creates embedded instance", async () => {
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

  const worlds = new Worlds({
    storage,
    management: { keys, namespaces, worlds: worldsRepo },
    namespace: "test-ns",
  });

  assertEquals(typeof worlds.init, "function");
  assertEquals(typeof worlds.getWorld, "function");
  assertEquals(typeof worlds.createWorld, "function");
  assertEquals(typeof worlds.listWorlds, "function");

  await worlds[Symbol.asyncDispose]();
  await storage.close();
});

Deno.test("EmbeddedWorlds - full lifecycle", async () => {
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
    storage,
    management: { keys, namespaces, worlds: worldsRepo },
    namespace: "test-ns",
  });

  await worlds.init();

  const world = await worlds.createWorld({
    id: "test-world",
    displayName: "Test World",
  });

  assertEquals(world.id, "test-world");
  assertEquals(world.displayName, "Test World");

  const found = await worlds.getWorld({ source: "test-world" });
  assertExists(found);

  const list = await worlds.listWorlds();
  assertEquals(list.worlds.length, 1);

  await worlds[Symbol.asyncDispose]();
  await storage.close();
});

Deno.test("Worlds defaults to embedded in-memory", async () => {
  const worlds = new Worlds();

  assertEquals(typeof worlds.init, "function");
  assertEquals(typeof worlds.getWorld, "function");

  await worlds[Symbol.asyncDispose]();
});
