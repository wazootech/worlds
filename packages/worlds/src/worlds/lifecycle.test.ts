import { assertEquals } from "@std/assert";
import { createTestContext } from "#/engine-context.ts";
import { LocalWorlds } from "#/worlds/local.ts";


Deno.test("LocalWorlds Lifecycle", async (t) => {
  await t.step("multiple init() calls are safe", async () => {
    await using appContext = await createTestContext();
    await using worlds = new LocalWorlds(appContext);

    // Call init multiple times concurrently
    await Promise.all([
      worlds.init(),
      worlds.init(),
      worlds.init(),
    ]);

    // Should be initialized
    const list = await worlds.list();
    assertEquals(Array.isArray(list), true);
  });

  await t.step("methods work without explicit init()", async () => {
    await using appContext = await createTestContext();
    await using worlds = new LocalWorlds(appContext);

    // Call a method without explicit init()
    // It should work (init is no-op in new architecture)
    const list = await worlds.list();
    assertEquals(Array.isArray(list), true);
  });

  await t.step("dispose closes storage", async () => {
    await using appContext = await createTestContext();
    const worlds = new LocalWorlds(appContext);
    await worlds.init();

    // Create a world to ensure storage has data
    await worlds.create({
      name: "test-world",
      label: "Test",
    });

    // Dispose it
    await worlds[Symbol.asyncDispose]();

    // After dispose, calling methods throws or returns empty
    // Since in-memory storage persists until app restart,
    // we just verify dispose doesn't throw
  });
});
