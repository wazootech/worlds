import { assertEquals } from "@std/assert";
import {
  defaultWorldsNamespaceNameSegment,
  defaultWorldsWorldNameSegment,
  resolveSource,
  SourceParseError,
  toWorldName,
} from "#/core/sources.ts";

Deno.test("resolveSource - String inputs", async (t) => {
  await t.step("parses qualified name", () => {
    const result = resolveSource("ns-a/my-world");
    assertEquals(result.namespace, "ns-a");
    assertEquals(result.world, "my-world");
  });

  await t.step("parses world-only (uses default namespace)", () => {
    const result = resolveSource("my-world");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
    assertEquals(result.world, "my-world");
  });

  await t.step("'_' in namespace returns null (use context default)", () => {
    const result = resolveSource("_/my-world");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
    assertEquals(result.world, "my-world");
  });

  await t.step("'_' in world returns null (use context default)", () => {
    const result = resolveSource("ns-a/_");
    assertEquals(result.namespace, "ns-a");
    assertEquals(result.world, defaultWorldsWorldNameSegment);
  });

  await t.step("both '_' returns defaults", () => {
    const result = resolveSource("_/_");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
    assertEquals(result.world, defaultWorldsWorldNameSegment);
  });

  await t.step("empty string returns defaults", () => {
    const result = resolveSource("");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
    assertEquals(result.world, defaultWorldsWorldNameSegment);
  });

  await t.step("whitespace-only returns defaults", () => {
    const result = resolveSource("   ");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
    assertEquals(result.world, defaultWorldsWorldNameSegment);
  });
});

Deno.test("resolveSource - Object inputs with name", async (t) => {
  await t.step("explicit qualified name", () => {
    const result = resolveSource({ name: "ns-a/my-world" });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, "ns-a");
  });

  await t.step("name with '_' in namespace uses context default", () => {
    const result = resolveSource({ name: "_/my-world" });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });

  await t.step("name with '_' in world uses context default", () => {
    const result = resolveSource({ name: "ns-a/_" });
    assertEquals(result.world, defaultWorldsWorldNameSegment);
    assertEquals(result.namespace, "ns-a");
  });

  await t.step("name only (world-only)", () => {
    const result = resolveSource({ name: "my-world" });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });

  await t.step("name with write property", () => {
    const result = resolveSource({ name: "ns-a/my-world", write: true });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, "ns-a");
  });
});

Deno.test("resolveSource - Context override", async (t) => {
  await t.step("context namespace overrides default", () => {
    const result = resolveSource("my-world", { namespace: "context-ns" });
    assertEquals(result.namespace, "context-ns");
    assertEquals(result.world, "my-world");
  });

  await t.step("context with undefined namespace uses default", () => {
    const result = resolveSource("my-world", { namespace: undefined });
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });

  await t.step("'_' in string with context namespace", () => {
    const result = resolveSource("_/my-world", { namespace: "context-ns" });
    assertEquals(result.namespace, "context-ns");
    assertEquals(result.world, "my-world");
  });

  await t.step("name object with context namespace", () => {
    const result = resolveSource({ name: "_/my-world" }, { namespace: "context-ns" });
    assertEquals(result.namespace, "context-ns");
    assertEquals(result.world, "my-world");
  });
});

Deno.test("toWorldName - formats resolved source", async (t) => {
  await t.step("formats with explicit namespace and world", () => {
    const result = toWorldName({ namespace: "ns-a", world: "my-world" });
    assertEquals(result, "ns-a/my-world");
  });

  await t.step("formats with default namespace", () => {
    const result = toWorldName({ namespace: defaultWorldsNamespaceNameSegment, world: "my-world" });
    assertEquals(result, "_/my-world");
  });

  await t.step("formats with default world", () => {
    const result = toWorldName({ namespace: "ns-a", world: defaultWorldsWorldNameSegment });
    assertEquals(result, "ns-a/_");
  });

  await t.step("formats with both defaults", () => {
    const result = toWorldName({ namespace: defaultWorldsNamespaceNameSegment, world: defaultWorldsWorldNameSegment });
    assertEquals(result, "_/_");
  });

  await t.step("formats string input", () => {
    const result = toWorldName("ns-a/my-world");
    assertEquals(result, "ns-a/my-world");
  });

  await t.step("formats name object", () => {
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

  await t.step("roundtrip with '_' sentinel", () => {
    const resolved = resolveSource("_/my-world");
    const worldName = toWorldName(resolved);
    assertEquals(worldName, "_/my-world");
  });

  await t.step("roundtrip with context", () => {
    const resolved = resolveSource("_/my-world", { namespace: "context-ns" });
    const worldName = toWorldName(resolved);
    assertEquals(worldName, "context-ns/my-world");
  });
});

Deno.test("resolveSource - Context with world default", async (t) => {
  await t.step("context world overrides default", () => {
    const result = resolveSource("_", { world: "context-world" });
    assertEquals(result.world, "context-world");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });

  await t.step("context namespace and world together", () => {
    const result = resolveSource("_", { namespace: "context-ns", world: "context-world" });
    assertEquals(result.namespace, "context-ns");
    assertEquals(result.world, "context-world");
  });

  await t.step("'_' in string with context world", () => {
    const result = resolveSource("ns-a/_", { world: "context-world" });
    assertEquals(result.namespace, "ns-a");
    assertEquals(result.world, "context-world");
  });
});

Deno.test("SourceParseError - thrown on invalid input", async (t) => {
  await t.step("multiple slashes throws error", async () => {
    try {
      resolveSource("a/b/c");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error).message.includes("multiple slashes"), true);
    }
  });

  await t.step("valid input does not throw", () => {
    const result = resolveSource("a/b");
    assertEquals(result.world, "b");
    assertEquals(result.namespace, "a");
  });

  await t.step("object without name throws error", async () => {
    try {
      resolveSource({ foo: "my-world" } as any);
      throw new Error("Expected error to be thrown");
    } catch (e) {
      assertEquals((e as Error).message.includes("name"), true);
    }
  });
});

Deno.test("resolveSource - Edge cases", async (t) => {
  await t.step("special characters in world name", () => {
    const result = resolveSource("ns-a/my-world_123");
    assertEquals(result.namespace, "ns-a");
    assertEquals(result.world, "my-world_123");
  });

  await t.step("trailing slash uses default world", () => {
    const result = resolveSource("ns-a/");
    assertEquals(result.namespace, "ns-a");
    assertEquals(result.world, defaultWorldsWorldNameSegment);
  });
});