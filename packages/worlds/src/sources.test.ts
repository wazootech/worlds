import { assert, assertEquals, assertThrows } from "@std/assert";
import { resolveSource, SourceParseError, toWorldName } from "./sources.ts";

Deno.test("resolveSource - String inputs", async (t) => {
  await t.step("parses qualified name", () => {
    const result = resolveSource("ns/world");
    assertEquals(result, { namespace: "ns", world: "world" });
  });

  await t.step("parses world-only (uses undefined namespace)", () => {
    const result = resolveSource("world");
    assertEquals(result, { namespace: undefined, world: "world" });
  });

  await t.step("'_' in namespace returns undefined", () => {
    const result = resolveSource("_/world");
    assertEquals(result, { namespace: undefined, world: "world" });
  });

  await t.step("'_' in world returns undefined", () => {
    const result = resolveSource("ns/_");
    assertEquals(result, { namespace: "ns", world: undefined });
  });

  await t.step("both '_' returns empty resolved source", () => {
    const result = resolveSource("_/_");
    assertEquals(result, { namespace: undefined, world: undefined });
  });

  await t.step("empty string returns empty resolved source", () => {
    const result = resolveSource("");
    assertEquals(result, {});
  });

  await t.step("whitespace-only returns empty resolved source", () => {
    const result = resolveSource("   ");
    assertEquals(result, { namespace: undefined, world: undefined });
  });

  await t.step("single '_' returns empty resolved source", () => {
    const result = resolveSource("_");
    assertEquals(result, {});
  });
});

Deno.test("resolveSource - Object inputs with name", async (t) => {
  await t.step("explicit qualified name", () => {
    const result = resolveSource({ name: "ns/world" });
    assertEquals(result, { namespace: "ns", world: "world" });
  });

  await t.step("name with '_' in namespace resolves to undefined", () => {
    const result = resolveSource({ name: "_/world" });
    assertEquals(result, { namespace: undefined, world: "world" });
  });

  await t.step("name only (world-only)", () => {
    const result = resolveSource({ name: "world" });
    assertEquals(result, { namespace: undefined, world: "world" });
  });
});

Deno.test("toWorldName - formats resolved source", async (t) => {
  await t.step("formats with explicit namespace and world", () => {
    const result = toWorldName({ namespace: "ns", world: "world" });
    assertEquals(result, "ns/world");
  });

  await t.step("formats with omitted namespace (returns just world)", () => {
    const result = toWorldName({ world: "world" });
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

  await t.step("roundtrip with root world", () => {
    const source = "_/world";
    const resolved = resolveSource(source);
    const name = toWorldName(resolved);
    assertEquals(name, "world");
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

  await t.step("invalid object without name throws error", () => {
    try {
      resolveSource({} as any);
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
      assert(e.message.includes("missing 'name'"));
    }
  });

  await t.step("number input throws error", () => {
    try {
      resolveSource(123 as any);
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
      resolveSource(true as any);
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
      resolveSource([] as any);
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
      assert(e.message.includes("missing 'name'"));
    }
  });
});

Deno.test("SourceParseError - edge cases", async (t) => {
  await t.step("space in name throws error", () => {
    try {
      resolveSource("ns/hello world");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
      assert(e.message.includes("space"));
    }
  });

  await t.step("space only throws error", () => {
    try {
      resolveSource("hello world");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
    }
  });

  await t.step("backslash throws error", () => {
    try {
      resolveSource("ns\\world");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
      assert(e.message.includes("backslash"));
    }
  });

  await t.step("special characters throw error", () => {
    try {
      resolveSource("ns/world!@#$");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
      assert(e.message.includes("alphanumeric"));
    }
  });

  await t.step("trailing slash throws error", () => {
    try {
      resolveSource("ns/");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
      assert(e.message.includes("trailing slash"));
    }
  });

  await t.step("leading slash throws error", () => {
    try {
      resolveSource("/world");
      throw new Error("Expected error to be thrown");
    } catch (e) {
      if (!(e instanceof SourceParseError)) {
        throw new Error(`Expected SourceParseError, got: ${e}`);
      }
      assert(e.message.includes("leading"));
    }
  });
});

Deno.test("SourceParseError - valid edge cases", async (t) => {
  await t.step("double underscore allowed", () => {
    const result = resolveSource("ns/my__world");
    assertEquals(result, { namespace: "ns", world: "my__world" });
  });

  await t.step("hyphen allowed", () => {
    const result = resolveSource("ns/my-world");
    assertEquals(result, { namespace: "ns", world: "my-world" });
  });

  await t.step("numbers allowed", () => {
    const result = resolveSource("ns/world123");
    assertEquals(result, { namespace: "ns", world: "world123" });
  });
});
