import { assertEquals } from "@std/assert";
import { createTestContext } from "./context.ts";
import { Worlds } from "#/worlds/worlds.ts";

Deno.test("Worlds Engine Lifecycle", async (t) => {
  await t.step("multiple init() calls are safe", async () => {
    await using context = await createTestContext();
    const worlds = new Worlds({
      management: context.management,
      storeEngine: context.storage,
    });

    await Promise.all([
      worlds.init(),
      worlds.init(),
      worlds.init(),
    ]);

    const list = await worlds.list();
    assertEquals(Array.isArray(list), true);
  });

  await t.step("methods work without explicit init()", async () => {
    await using context = await createTestContext();
    const worlds = new Worlds({
      management: context.management,
      storeEngine: context.storage,
    });

    const list = await worlds.list();
    assertEquals(Array.isArray(list), true);
  });

  await t.step("dispose does not throw", async () => {
    await using context = await createTestContext();
    const worlds = new Worlds({
      management: context.management,
      storeEngine: context.storage,
    });
    await worlds.init();

    await worlds.create({
      name: "test-world",
      label: "Test",
    });

    await worlds[Symbol.asyncDispose]();
  });
});
