import { assertEquals } from "@std/assert";
import {
  defaultWorldsNamespaceNameSegment,
  defaultWorldsWorldNameSegment,
  toResolvedSource,
  toStorageName,
} from "#/core/sources.ts";

Deno.test("toResolvedSource - String inputs", async (t) => {
  await t.step("parses qualified name", () => {
    const result = toResolvedSource("ns-a/my-world");
    assertEquals(result.namespace, "ns-a");
    assertEquals(result.world, "my-world");
  });

  await t.step("parses world-only (uses default namespace)", () => {
    const result = toResolvedSource("my-world");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
    assertEquals(result.world, "my-world");
  });

  await t.step("'_' in namespace returns null (use context default)", () => {
    const result = toResolvedSource("_/my-world");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
    assertEquals(result.world, "my-world");
  });

  await t.step("'_' in world returns null (use context default)", () => {
    const result = toResolvedSource("ns-a/_");
    assertEquals(result.namespace, "ns-a");
    assertEquals(result.world, defaultWorldsWorldNameSegment);
  });

  await t.step("both '_' returns defaults", () => {
    const result = toResolvedSource("_/_");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
    assertEquals(result.world, defaultWorldsWorldNameSegment);
  });

  await t.step("empty string returns defaults", () => {
    const result = toResolvedSource("");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
    assertEquals(result.world, defaultWorldsWorldNameSegment);
  });

  await t.step("whitespace-only returns defaults", () => {
    const result = toResolvedSource("   ");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
    assertEquals(result.world, defaultWorldsWorldNameSegment);
  });
});

Deno.test("toResolvedSource - Object inputs", async (t) => {
  await t.step("explicit world and namespace", () => {
    const result = toResolvedSource({ world: "my-world", namespace: "ns-a" });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, "ns-a");
  });

  await t.step("null world uses context or default", () => {
    const result = toResolvedSource({ world: null, namespace: "ns-a" });
    assertEquals(result.world, defaultWorldsWorldNameSegment);
    assertEquals(result.namespace, "ns-a");
  });

  await t.step("null namespace uses context or default", () => {
    const result = toResolvedSource({ world: "my-world", namespace: null });
    assertEquals(result.world, "my-world");
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });

  await t.step("both null use context defaults", () => {
    const result = toResolvedSource({ world: null, namespace: null });
    assertEquals(result.world, defaultWorldsWorldNameSegment);
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });

  await t.step("empty object uses context defaults", () => {
    const result = toResolvedSource({});
    assertEquals(result.world, defaultWorldsWorldNameSegment);
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });
});

Deno.test("toResolvedSource - Context override", async (t) => {
  await t.step("context namespace overrides default", () => {
    const result = toResolvedSource("my-world", { namespace: "context-ns" });
    assertEquals(result.namespace, "context-ns");
    assertEquals(result.world, "my-world");
  });

  await t.step("context with undefined namespace uses default", () => {
    const result = toResolvedSource("my-world", { namespace: undefined });
    assertEquals(result.namespace, defaultWorldsNamespaceNameSegment);
  });

  await t.step("explicit source namespace overrides context", () => {
    const result = toResolvedSource(
      { world: "my-world", namespace: "explicit-ns" },
      { namespace: "context-ns" },
    );
    assertEquals(result.namespace, "explicit-ns");
  });

  await t.step("string source with context namespace", () => {
    const result = toResolvedSource("_/my-world", { namespace: "context-ns" });
    assertEquals(result.namespace, "context-ns");
    assertEquals(result.world, "my-world");
  });
});

Deno.test("toStorageName - formats resolved source", async (t) => {
  await t.step("formats with explicit namespace and world", () => {
    const result = toStorageName({ namespace: "ns-a", world: "my-world" });
    assertEquals(result, "ns-a:my-world");
  });

  await t.step("formats with default namespace", () => {
    const result = toStorageName({
      namespace: defaultWorldsNamespaceNameSegment,
      world: "my-world",
    });
    assertEquals(result, "default:my-world");
  });

  await t.step("formats with default world", () => {
    const result = toStorageName({
      namespace: "ns-a",
      world: defaultWorldsWorldNameSegment,
    });
    assertEquals(result, "ns-a:default");
  });

  await t.step("formats with both defaults", () => {
    const result = toStorageName({
      namespace: defaultWorldsNamespaceNameSegment,
      world: defaultWorldsWorldNameSegment,
    });
    assertEquals(result, "default:default");
  });
});

Deno.test("toResolvedSource + toStorageName - composition", async (t) => {
  await t.step("full roundtrip with qualified name", () => {
    const resolved = toResolvedSource("ns-a/my-world");
    const storageKey = toStorageName(resolved);
    assertEquals(storageKey, "ns-a:my-world");
  });

  await t.step("roundtrip with '_' sentinel", () => {
    const resolved = toResolvedSource("_/my-world");
    const storageKey = toStorageName(resolved);
    assertEquals(storageKey, "default:my-world");
  });

  await t.step("roundtrip with context", () => {
    const resolved = toResolvedSource("_/my-world", {
      namespace: "context-ns",
    });
    const storageKey = toStorageName(resolved);
    assertEquals(storageKey, "context-ns:my-world");
  });
});
