import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  defaultNamespace,
  defaultWorld,
  isNamedSource,
  isQualifiedSource,
  isSource,
  resolveSource,
  SourceParseError,
  toWorldName,
} from "./resolver.ts";
import type { Source } from "../api/v1/source.types.ts";

Deno.test("Resolver Helpers - Type Guards", async (t) => {
  await t.step("isNamedSource identifies valid objects", () => {
    assert(isNamedSource({ name: "ns/world" }));
    assert(isNamedSource({ name: "world", mode: "write" }));
    assert(!isNamedSource("world"));
    assert(!isNamedSource({ id: "world" }));
    assert(!isNamedSource(null));
  });

  await t.step("isQualifiedSource identifies valid objects", () => {
    assert(isQualifiedSource({ id: "world" }));
    assert(isQualifiedSource({ namespace: "ns", id: "world" }));
    assert(isQualifiedSource({ namespace: "ns" }));
    assert(!isQualifiedSource({ name: "world" }));
    assert(!isQualifiedSource("world"));
    assert(!isQualifiedSource(null));
  });

  await t.step("isSource identifies all valid source types", () => {
    assert(isSource("world"));
    assert(isSource("ns/world"));
    assert(isSource({ name: "world" }));
    assert(isSource({ id: "world" }));
    assert(isSource({ namespace: "ns", id: "world" }));
    assert(!isSource(123));
    assert(!isSource(null));
    assert(isSource({ foo: "bar" }));
  });

  await t.step("resolves empty object as default source", () => {
    const resolved = resolveSource({});
    assertEquals(resolved.id, defaultWorld);
    assertEquals(resolved.namespace, defaultNamespace);
    assertEquals(resolved.mode, "deferred");
  });

  await t.step("resolves object with mode flag", () => {
    const resolved = resolveSource({ mode: "write" });
    assertEquals(resolved.id, defaultWorld);
    assertEquals(resolved.namespace, defaultNamespace);
    assertEquals(resolved.mode, "write");
  });
});

Deno.test("resolveSource - Edge cases", async (t) => {
  await t.step("parses qualified name", () => {
    const result = resolveSource("ns/world");
    assertEquals(result, { namespace: "ns", id: "world", mode: "deferred" });
  });

  await t.step("parses world-only (uses undefined namespace)", () => {
    const result = resolveSource("world");
    assertEquals(result, {
      namespace: undefined,
      id: "world",
      mode: "deferred",
    });
  });

  await t.step("'_' in namespace returns undefined", () => {
    const result = resolveSource("_/world");
    assertEquals(result, {
      namespace: undefined,
      id: "world",
      mode: "deferred",
    });
  });

  await t.step("'_' in world is returned as literal world ID", () => {
    const result = resolveSource("ns/_");
    assertEquals(result, { namespace: "ns", id: "_", mode: "deferred" });
  });

  await t.step("both '_' returns id='_' and undefined namespace", () => {
    const result = resolveSource("_/_");
    assertEquals(result, { namespace: undefined, id: "_", mode: "deferred" });
  });

  await t.step("empty string throws SourceParseError", () => {
    assertThrows(
      () => resolveSource(""),
      SourceParseError,
      "Source name cannot be empty",
    );
  });

  await t.step("whitespace-only throws SourceParseError", () => {
    assertThrows(
      () => resolveSource("   "),
      SourceParseError,
      "Source name cannot be empty",
    );
  });

  await t.step("single '_' returns it as literal world id", () => {
    const result = resolveSource("_");
    assertEquals(result, { namespace: undefined, id: "_", mode: "deferred" });
  });
});

Deno.test("resolveSource - Environment variables", async (t) => {
  await t.step("uses defaultWorld and defaultNamespace constants", () => {
    // This test verifies that resolveSource uses the exported constants.
    // Since they are initialized at module load, we compare against them directly.
    const result = resolveSource({});
    assertEquals(result.id, defaultWorld);
    assertEquals(result.namespace, defaultNamespace);
    assertEquals(result.mode, "deferred");
  });
});

Deno.test("resolveSource - Object inputs with name", async (t) => {
  await t.step("explicit qualified name", () => {
    const result = resolveSource({ name: "ns/world" });
    assertEquals(result, { namespace: "ns", id: "world", mode: "deferred" });
  });

  await t.step("name with '_' in namespace resolves to undefined", () => {
    const result = resolveSource({ name: "_/world" });
    assertEquals(result, {
      namespace: undefined,
      id: "world",
      mode: "deferred",
    });
  });

  await t.step("name only (world-only)", () => {
    const result = resolveSource({ name: "world" });
    assertEquals(result, {
      namespace: undefined,
      id: "world",
      mode: "deferred",
    });
  });

  await t.step("name with explicit mode", () => {
    const result = resolveSource({ name: "world", mode: "write" });
    assertEquals(result, { namespace: undefined, id: "world", mode: "write" });
  });
});

Deno.test("toWorldName - formats resolved source", async (t) => {
  await t.step("formats with explicit namespace and world", () => {
    const result = toWorldName({ namespace: "ns", id: "world" });
    assertEquals(result, "ns/world");
  });

  await t.step("formats with omitted namespace (returns just world)", () => {
    const result = toWorldName({ id: "world" });
    assertEquals(result, "world");
  });

  await t.step("formats with omitted world (returns namespace/)", () => {
    const result = toWorldName({ namespace: "ns" });
    assertEquals(result, "ns/");
  });

  await t.step("formats with both omitted (returns empty string)", () => {
    const result = toWorldName({});
    assertEquals(result, "");
  });

  await t.step("formats string input (unqualified)", () => {
    const result = toWorldName("world");
    assertEquals(result, "world");
  });

  await t.step("formats name object (qualified)", () => {
    const result = toWorldName({ name: "ns/world" });
    assertEquals(result, "ns/world");
  });

  await t.step("formats literal '_' as world name", () => {
    const result = toWorldName({ id: "_" });
    assertEquals(result, "_");
  });

  await t.step("formats namespace and literal '_' as world", () => {
    const result = toWorldName({ namespace: "ns", id: "_" });
    assertEquals(result, "ns/_");
  });
});

Deno.test("resolveSource + toWorldName - composition", async (t) => {
  await t.step("full roundtrip with qualified name", () => {
    const source = "ns/world";
    const resolved = resolveSource(source);
    const name = toWorldName(resolved);
    assertEquals(name, source);
  });

  await t.step("roundtrip with omitted segments", () => {
    const source = "world";
    const resolved = resolveSource(source);
    const name = toWorldName(resolved);
    assertEquals(name, source);
  });

  await t.step("roundtrip with literal '_' world", () => {
    const source = "_";
    const resolved = resolveSource(source);
    const name = toWorldName(resolved);
    assertEquals(name, "_");
  });

  await t.step("roundtrip with qualified '-' world", () => {
    const source = "ns/_";
    const resolved = resolveSource(source);
    const name = toWorldName(resolved);
    assertEquals(name, "ns/_");
  });
});

Deno.test("SourceParseError - thrown on invalid input", async (t) => {
  await t.step("strictly flat paths required", () => {
    assertThrows(
      () => resolveSource("ns/sub/world"),
      SourceParseError,
      "strictly flat namespace format required",
    );
  });

  await t.step(
    "empty object resolves to default source instead of throwing",
    () => {
      const result = resolveSource({} as unknown as Source);
      assertEquals(result.id, defaultWorld);
      assertEquals(result.namespace, defaultNamespace);
      assertEquals(result.mode, "deferred");
    },
  );

  await t.step("number input throws error", () => {
    try {
      resolveSource(123 as unknown as Source);
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
      assert(e.message.includes("Invalid source format"));
    }
  });

  await t.step("boolean input throws error", () => {
    try {
      resolveSource(true as unknown as Source);
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
      assert(e.message.includes("Invalid source format"));
    }
  });

  await t.step("array input throws error", () => {
    try {
      resolveSource([] as unknown as Source);
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
      assert(e.message.includes("Invalid source format"));
    }
  });

  await t.step("empty name in object throws error", () => {
    try {
      resolveSource({ name: "" });
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
      assert(e.message.includes("Source name cannot be empty"));
    }
  });
});
