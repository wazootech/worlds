import { assertEquals } from "@std/assert";
import { resolveSource, toWorldName, resolveNamespace, resolveWorldId, SourceParseError } from "#/sources.ts";


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
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("multiple slashes"), true);
    }
  });

  await t.step("invalid object without name throws error", () => {
    try {
      resolveSource({} as any);
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("missing 'name' property"), true);
    }
  });

  await t.step("number input throws error", () => {
    try {
      resolveSource(123 as any);
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("Invalid source format"), true);
    }
  });

  await t.step("boolean input throws error", () => {
    try {
      resolveSource(true as any);
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("Invalid source format"), true);
    }
  });

  await t.step("array input throws error", () => {
    try {
      resolveSource([] as any);
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("Invalid source format"), true);
    }
  });

  await t.step("empty name in object throws error", () => {
    try {
      resolveSource({ name: "" });
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("missing 'name' property"), true);
    }
  });
});

Deno.test("SourceParseError - edge cases", async (t) => {
  await t.step("space in name throws error", () => {
    try {
      resolveSource("ns/hello world");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("space"), true);
    }
  });

  await t.step("space only throws error", () => {
    try {
      resolveSource("hello world");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
    }
  });

  await t.step("backslash throws error", () => {
    try {
      resolveSource("ns\\world");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("backslash"), true);
    }
  });

  await t.step("special characters throw error", () => {
    try {
      resolveSource("ns/world!@#$");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("alphanumeric"), true);
    }
  });

  await t.step("trailing slash throws error", () => {
    try {
      resolveSource("ns/");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("trailing slash"), true);
    }
  });

  await t.step("leading slash throws error", () => {
    try {
      resolveSource("/world");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error) instanceof SourceParseError, true);
      assertEquals((e as Error).message.includes("leading"), true);
    }
  });
});

Deno.test("SourceParseError - valid edge cases", async (t) => {
  await t.step("double underscore allowed", () => {
    const result = resolveSource("ns__world");
    assertEquals(result.world, "ns__world");
  });

  await t.step("hyphen allowed", () => {
    const result = resolveSource("ns-my-world");
    assertEquals(result.world, "ns-my-world");
  });

  await t.step("numbers allowed", () => {
    const result = resolveSource("ns123/world456");
    assertEquals(result.namespace, "ns123");
    assertEquals(result.world, "world456");
  });
});

Deno.test("resolveNamespace - null/undefined inputs", async (t) => {
  await t.step("null source returns undefined", () => {
    const result = resolveNamespace(null as any);
    assertEquals(result, undefined);
  });

  await t.step("undefined source returns undefined", () => {
    const result = resolveNamespace(undefined as any);
    assertEquals(result, undefined);
  });

  await t.step("null with default returns default", () => {
    const result = resolveNamespace(null as any, "default-ns");
    assertEquals(result, "default-ns");
  });

  await t.step("object source with name", () => {
    const result = resolveNamespace({ name: "ns/world" });
    assertEquals(result, "ns");
  });

  await t.step("world-only uses default namespace", () => {
    const result = resolveNamespace("world-only", "my-ns");
    assertEquals(result, "my-ns");
  });
});

Deno.test("resolveWorldId - null/undefined inputs", async (t) => {
  await t.step("null source returns undefined", () => {
    const result = resolveWorldId(null as any);
    assertEquals(result, undefined);
  });

  await t.step("undefined source returns undefined", () => {
    const result = resolveWorldId(undefined as any);
    assertEquals(result, undefined);
  });

  await t.step("null with default returns default", () => {
    const result = resolveWorldId(null as any, "default-world");
    assertEquals(result, "default-world");
  });

  await t.step("object source with name", () => {
    const result = resolveWorldId({ name: "ns/world" });
    assertEquals(result, "world");
  });

  await t.step("namespace/world returns world", () => {
    const result = resolveWorldId("ns/world-id");
    assertEquals(result, "world-id");
  });
});
