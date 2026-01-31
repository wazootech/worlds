import { assertEquals, assertThrows } from "@std/assert";
import {
  getDefaultSource,
  getSourceByWorldId,
  normalizeSources,
  validateSources,
} from "./utils.ts";
import type { CreateToolsOptions, SourceOptions } from "./types.ts";

Deno.test("normalizeSources", async (t) => {
  await t.step("returns empty array for undefined", () => {
    const result = normalizeSources(undefined);
    assertEquals(result, []);
    assertEquals(result.length, 0);
  });

  await t.step("returns empty array for empty array", () => {
    const result = normalizeSources([]);
    assertEquals(result, []);
    assertEquals(result.length, 0);
  });

  await t.step("returns same array for non-empty array", () => {
    const sources: SourceOptions[] = [
      { worldId: "world1" },
      { worldId: "world2", default: true },
    ];
    const result = normalizeSources(sources);
    assertEquals(result, sources);
    assertEquals(result.length, 2);
  });

  await t.step("returns same array for single source", () => {
    const sources: SourceOptions[] = [{ worldId: "world1", default: true }];
    const result = normalizeSources(sources);
    assertEquals(result, sources);
    assertEquals(result.length, 1);
  });
});

Deno.test("validateSources", async (t) => {
  await t.step("passes for undefined", () => {
    validateSources(undefined);
  });

  await t.step("passes for empty array", () => {
    validateSources([]);
  });

  await t.step("passes for single source", () => {
    validateSources([{ worldId: "world1" }]);
  });

  await t.step("passes for multiple sources with unique worldIds", () => {
    validateSources([
      { worldId: "world1" },
      { worldId: "world2" },
      { worldId: "world3" },
    ]);
  });

  await t.step("throws error for duplicate worldIds", () => {
    assertThrows(
      () => {
        validateSources([
          { worldId: "world1" },
          { worldId: "world2" },
          { worldId: "world1" },
        ]);
      },
      Error,
      "Duplicate worldIds found in sources: world1",
    );
  });

  await t.step("throws error for multiple duplicates", () => {
    assertThrows(
      () => {
        validateSources([
          { worldId: "world1" },
          { worldId: "world2" },
          { worldId: "world1" },
          { worldId: "world2" },
        ]);
      },
      Error,
      "Duplicate worldIds found in sources: world1, world2",
    );
  });

  await t.step("throws error for all duplicates", () => {
    assertThrows(
      () => {
        validateSources([
          { worldId: "world1" },
          { worldId: "world1" },
          { worldId: "world1" },
        ]);
      },
      Error,
      "Duplicate worldIds found in sources: world1",
    );
  });
});

Deno.test("getDefaultSource", async (t) => {
  await t.step("returns undefined for undefined sources", () => {
    const result = getDefaultSource(undefined);
    assertEquals(result, undefined);
  });

  await t.step("returns undefined for empty array", () => {
    const result = getDefaultSource([]);
    assertEquals(result, undefined);
  });

  await t.step("returns single source when only one source exists", () => {
    const sources: SourceOptions[] = [{ worldId: "world1" }];
    const result = getDefaultSource(sources);
    assertEquals(result, sources[0]);
  });

  await t.step("returns single source with default: true", () => {
    const sources: SourceOptions[] = [{ worldId: "world1", default: true }];
    const result = getDefaultSource(sources);
    assertEquals(result, sources[0]);
  });

  await t.step("throws error for single source with default: false", () => {
    assertThrows(
      () => {
        getDefaultSource([{ worldId: "world1", default: false }]);
      },
      Error,
      "Single source must be marked as default (set default: true)",
    );
  });

  await t.step(
    "returns source with default: true when multiple sources",
    () => {
      const sources: SourceOptions[] = [
        { worldId: "world1" },
        { worldId: "world2", default: true },
        { worldId: "world3" },
      ];
      const result = getDefaultSource(sources);
      assertEquals(result, sources[1]);
      assertEquals(result?.worldId, "world2");
    },
  );

  await t.step("returns undefined when no default in multiple sources", () => {
    const sources: SourceOptions[] = [
      { worldId: "world1" },
      { worldId: "world2" },
      { worldId: "world3" },
    ];
    const result = getDefaultSource(sources);
    assertEquals(result, undefined);
  });

  await t.step("throws error for multiple default sources", () => {
    assertThrows(
      () => {
        getDefaultSource([
          { worldId: "world1", default: true },
          { worldId: "world2", default: true },
          { worldId: "world3" },
        ]);
      },
      Error,
      "Multiple default sources found. Only one source can be marked as default. Found default sources with worldIds: world1, world2",
    );
  });

  await t.step("throws error for all sources marked as default", () => {
    assertThrows(
      () => {
        getDefaultSource([
          { worldId: "world1", default: true },
          { worldId: "world2", default: true },
          { worldId: "world3", default: true },
        ]);
      },
      Error,
      "Multiple default sources found. Only one source can be marked as default. Found default sources with worldIds: world1, world2, world3",
    );
  });
});

Deno.test("getSourceByWorldId", async (t) => {
  const baseOptions = {
    baseUrl: "http://localhost/v1",
    apiKey: "test-key",
  };

  await t.step("returns undefined for undefined sources", () => {
    const options: CreateToolsOptions = {
      ...baseOptions,
      sources: undefined,
    };
    const result = getSourceByWorldId(options, "world1");
    assertEquals(result, undefined);
  });

  await t.step("returns undefined for empty sources", () => {
    const options: CreateToolsOptions = {
      ...baseOptions,
      sources: [],
    };
    const result = getSourceByWorldId(options, "world1");
    assertEquals(result, undefined);
  });

  await t.step("returns undefined when worldId not found", () => {
    const options: CreateToolsOptions = {
      ...baseOptions,
      sources: [
        { worldId: "world1" },
        { worldId: "world2" },
      ],
    };
    const result = getSourceByWorldId(options, "world3");
    assertEquals(result, undefined);
  });

  await t.step("returns source when worldId found", () => {
    const source: SourceOptions = { worldId: "world1", default: true };
    const options: CreateToolsOptions = {
      ...baseOptions,
      sources: [
        source,
        { worldId: "world2" },
      ],
    };
    const result = getSourceByWorldId(options, "world1");
    assertEquals(result, source);
  });

  await t.step("returns first matching source when duplicates exist", () => {
    const source1: SourceOptions = { worldId: "world1" };
    const source2: SourceOptions = { worldId: "world1", default: true };
    const options: CreateToolsOptions = {
      ...baseOptions,
      sources: [source1, source2],
    };
    const result = getSourceByWorldId(options, "world1");
    assertEquals(result, source1);
  });
});
