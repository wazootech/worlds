import { assertEquals } from "@std/assert";
import { resolveSource, toWorldName } from "#/core/sources.ts";

Deno.test("resolveSource - String inputs", async (t) => {
  await t.step("parses qualified name", () => {
    const result = resolveSource("ns-a/my-world");
    assertEquals(result.namespace, "ns-a");
    assertEquals(result.world, "my-world");
  });

  await t.step("parses world-only (uses undefined namespace)", () => {
    const result = resolveSource("my-world");
    assertEquals(result.namespace, undefined);
    assertEquals(result.world, "my-world");
  });

  await t.step("'_' in namespace returns undefined", () => {
    const result = resolveSource("_/my-world");
    assertEquals(result.namespace, undefined);
    assertEquals(result.world, "my-world");
  });

  await t.step("'_' in world returns undefined", () => {
    const result = resolveSource("ns-a/_");
    assertEquals(result.namespace, "ns-a");
    assertEquals(result.world, undefined);
  });

  await t.step("both '_' returns empty resolved source", () => {
    const result = resolveSource("_/_");
    assertEquals(result.namespace, undefined);
    assertEquals(result.world, undefined);
  });

  await t.step("empty string returns empty resolved source", () => {
    const result = resolveSource("");
    assertEquals(result.namespace, undefined);
    assertEquals(result.world, undefined);
  });

  await t.step("whitespace-only returns empty resolved source", () => {
    const result = resolveSource("   ");
    assertEquals(result.namespace, undefined);
    assertEquals(result.world, undefined);
  });

  await t.step("single '_' returns empty resolved source", () => {
    const result = resolveSource("_");
    assertEquals(result.namespace, undefined);
    assertEquals(result.world, undefined);
  });
});

Deno.test("resolveSource - Object inputs with name", async (t) => {
  await t.step("explicit qualified name", () => {
    const result = resolveSource({ name: "ns-a/my-world" });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, "ns-a");
  });

  await t.step("name with '_' in namespace resolves to undefined", () => {
    const result = resolveSource({ name: "_/my-world" });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, undefined);
  });

  await t.step("name only (world-only)", () => {
    const result = resolveSource({ name: "my-world" });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, undefined);
  });
});

Deno.test("toWorldName - formats resolved source", async (t) => {
  await t.step("formats with explicit namespace and world", () => {
    const result = toWorldName({ namespace: "ns-a", world: "my-world" });
    assertEquals(result, "ns-a/my-world");
  });

  await t.step("formats with omitted namespace (returns just world)", () => {
    const result = toWorldName({ namespace: undefined, world: "my-world" });
    assertEquals(result, "my-world");
  });

  await t.step("formats with omitted world (returns namespace/)", () => {
    const result = toWorldName({ namespace: "ns-a", world: undefined });
    assertEquals(result, "ns-a/");
  });

  await t.step("formats with both omitted (returns empty string)", () => {
    const result = toWorldName({ namespace: undefined, world: undefined });
    assertEquals(result, "");
  });

  await t.step("formats string input (unqualified)", () => {
    const result = toWorldName("my-world");
    assertEquals(result, "my-world");
  });

  await t.step("formats name object (qualified)", () => {
    const result = toWorldName({ name: "ns-a/my-world" });
    assertEquals(result, "ns-a/my-world");
  });
});

Deno.test("resolveSource + toWorldName - composition", async (t) => {
  await t.step("full roundtrip with qualified name", () => {
    const resolved = resolveSource("ns-a/my-world");
    const worldName = toWorldName(resolved);
    assertEquals(worldName, "ns-a/my-world");
  });

  await t.step("roundtrip with omitted segments", () => {
    const resolved = resolveSource("my-world");
    const worldName = toWorldName(resolved);
    assertEquals(worldName, "my-world");
  });

  await t.step("roundtrip with root world", () => {
    const resolved = resolveSource("_");
    const worldName = toWorldName(resolved);
    assertEquals(worldName, "");
  });
});

Deno.test("SourceParseError - thrown on invalid input", async (t) => {
  await t.step("multiple slashes throws error", () => {
    try {
      resolveSource("a/b/c");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error).message.includes("multiple slashes"), true);
    }
  });
});
