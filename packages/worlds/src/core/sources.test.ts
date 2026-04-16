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

Deno.test("resolveSource - Object inputs", async (t) => {
  await t.step("explicit world and namespace", () => {
    const result = resolveSource({ world: "my-world", namespace: "ns-a" });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, "ns-a");
  });

  await t.step("null world uses context or default", () => {
    const result = resolveSource({ world: null, namespace: "ns-a" });
    assertEquals(result.world, defaultWorldsWorldNameSegment);
    assertEquals(result.namespace, "ns-a");
  });

  await t.step("null namespace uses context or default", () => {
    const result = resolveSource({ world: "my-world", namespace: null });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });

  await t.step("both null use context defaults", () => {
    const result = resolveSource({ world: null, namespace: null });
    assertEquals(result.world, defaultWorldsWorldNameSegment);
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });

  await t.step("object with name property parses into components", () => {
    const result = resolveSource({ name: "ns-a/world-b" });
    assertEquals(result.namespace, "ns-a");
    assertEquals(result.world, "world-b");
  });

  await t.step("partial object (world only)", () => {
    const result = resolveSource({ world: "my-world" });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });

  await t.step("partial object (namespace only)", () => {
    const result = resolveSource({ namespace: "ns-a" });
    assertEquals(result.world, defaultWorldsWorldNameSegment);
    assertEquals(result.namespace, "ns-a");
  });

  await t.step("empty object", () => {
    const result = resolveSource({});
    assertEquals(result.world, defaultWorldsWorldNameSegment);
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
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

  await t.step("explicit source namespace overrides context", () => {
    const result = resolveSource(
      { world: "my-world", namespace: "explicit-ns" },
      { namespace: "context-ns" },
    );
    assertEquals(result.namespace, "explicit-ns");
  });

  await t.step("string source with context namespace", () => {
    const result = resolveSource("_/my-world", { namespace: "context-ns" });
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
    const result = toWorldName({
      namespace: defaultWorldsNamespaceNameSegment,
      world: "my-world",
    });
    assertEquals(result, "_/my-world");
  });

  await t.step("formats with default world", () => {
    const result = toWorldName({
      namespace: "ns-a",
      world: defaultWorldsWorldNameSegment,
    });
    assertEquals(result, "ns-a/_");
  });

  await t.step("formats with both defaults", () => {
    const result = toWorldName({
      namespace: defaultWorldsNamespaceNameSegment,
      world: defaultWorldsWorldNameSegment,
    });
    assertEquals(result, "_/_");
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
    const resolved = resolveSource("_/my-world", {
      namespace: "context-ns",
    });
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
    const result = resolveSource("_", {
      namespace: "context-ns",
      world: "context-world",
    });
    assertEquals(result.namespace, "context-ns");
    assertEquals(result.world, "context-world");
  });

  await t.step("explicit source overrides context world", () => {
    const result = resolveSource(
      { world: "explicit-world", namespace: "explicit-ns" },
      { world: "context-world", namespace: "context-ns" },
    );
    assertEquals(result.namespace, "explicit-ns");
    assertEquals(result.world, "explicit-world");
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
});
