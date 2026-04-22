import { assertEquals } from "@std/assert";
import { initRegistry } from "./factory.ts";

Deno.test("initRegistry - creates a service container", async () => {
  await using registry = await initRegistry();

  // Should have container properties
  assertEquals(typeof registry.apiKey, "string");
  assertEquals(typeof registry.storage, "object");
  assertEquals(typeof registry.embeddings, "object");
  assertEquals(typeof registry.management, "object");

  // Should spawn an engine
  const engine = await registry.engine();
  assertEquals(typeof engine.list, "function");

  // registry should track active engine
  assertEquals(registry.activeEngine, engine);
});

Deno.test("initRegistry - allows overrides", async () => {
  const customApiKey = "custom-key";
  await using registry = await initRegistry({
    envs: { WORLDS_API_KEY: customApiKey },
  });

  assertEquals(registry.apiKey, customApiKey);
});
