import { assertEquals } from "@std/assert";
import { createTestContext } from "./context.ts";
import { Worlds } from "../engine/service.ts";

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
    assertEquals(Array.isArray(list.worlds), true);
  });

  await t.step("cleanup multiple instances", async () => {
    await using context = await createTestContext();

    const w1 = new Worlds({
      management: context.management,
      storeEngine: context.storage,
    });
    const w2 = new Worlds({
      management: context.management,
      storeEngine: context.storage,
    });

    await w1.init();
    await w2.init();

    // Verify they both work
    const l1 = await w1.list();
    const l2 = await w2.list();

    assertEquals(l1.worlds.length, l2.worlds.length);

    await w1[Symbol.asyncDispose]();
    await w2[Symbol.asyncDispose]();
  });
});
