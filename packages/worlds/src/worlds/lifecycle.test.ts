import { assertEquals } from "@std/assert";
import { createTestContext } from "#/engine-context.ts";
import { Worlds } from "#/worlds/worlds.ts";

Deno.test("Worlds Engine Lifecycle", async (t) => {
  await t.step("multiple init() calls are safe", async () => {
    await using context = await createTestContext();
    const worlds = new Worlds({
      management: context.management,
      resolver: async (id, ns) =>
        await context.storage.get({ id, namespace: ns }),
    });

    // Call init multiple times concurrently
    await Promise.all([
      worlds.init(),
      worlds.init(),
      worlds.init(),
    ]);

    // Should work
    const list = await worlds.list();
    assertEquals(Array.isArray(list), true);
  });

  await t.step("methods work without explicit init()", async () => {
    await using context = await createTestContext();
    const worlds = new Worlds({
      management: context.management,
      resolver: async (id, ns) =>
        await context.storage.get({ id, namespace: ns }),
    });

    // Call a method without explicit init()
    const list = await worlds.list();
    assertEquals(Array.isArray(list), true);
  });

  await t.step("dispose does not throw", async () => {
    await using context = await createTestContext();
    const worlds = new Worlds({
      management: context.management,
      resolver: async (id, ns) =>
        await context.storage.get({ id, namespace: ns }),
    });
    await worlds.init();

    await worlds.create({
      name: "test-world",
      label: "Test",
    });

    await worlds[Symbol.asyncDispose]();
  });
});
