import { assertEquals, assertRejects } from "@std/assert";
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

  await t.step("methods wait for init()", async () => {
    await using appContext = await createTestContext();
    await using worlds = new LocalWorlds(appContext);

    // Call a method without explicit init()
    // It should internally trigger and await init()
    const list = await worlds.list();
    assertEquals(Array.isArray(list), true);
  });

  await t.step("dispose prevents further calls", async () => {
    await using appContext = await createTestContext();
    const worlds = new LocalWorlds(appContext);
    await worlds.init();

    // Dispose it
    await worlds[Symbol.asyncDispose]();

    // Further calls should fail gracefully or as expected
    await assertRejects(
      () => worlds.list(),
      Error,
      "Engine is closed",
    );
  });
});
