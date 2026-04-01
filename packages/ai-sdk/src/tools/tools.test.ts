import { assertEquals, assertExists, assertRejects } from "@std/assert";
import type { WorldsInterface } from "@wazoo/worlds-sdk";
import type {
  WorldsCreateInput,
  WorldsDeleteInput,
  WorldsExportInput,
  WorldsImportInput,
  WorldsUpdateInput,
} from "@wazoo/worlds-sdk";
import type { Log, World, WorldsSearchOutput } from "@wazoo/worlds-sdk";

import { sparql, worldsSparqlTool } from "./sparql/tool.ts";
import { search, worldsSearchTool } from "./search/tool.ts";
import { list, worldsListTool } from "./list/tool.ts";
import { get, worldsGetTool } from "./get/tool.ts";
import { create, worldsCreateTool } from "./create/tool.ts";
import { update, worldsUpdateTool } from "./update/tool.ts";
import { deleteWorld, worldsDeleteTool } from "./delete/tool.ts";
import { importData, worldsImportTool } from "./import/tool.ts";
import { exportData, worldsExportTool } from "./export/tool.ts";
import { listLogs, worldsLogsTool } from "./logs/tool.ts";

function createMockWorld(overrides?: Partial<World>): World {
  const now = Date.now();
  return {
    id: "test-id",
    slug: "test",
    label: "Test",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

const mockWorldsBase: WorldsInterface = {
  list: () => Promise.resolve([]),
  get: () => Promise.resolve(null),
  create: () => Promise.resolve(createMockWorld()),
  update: () => Promise.resolve(),
  delete: () => Promise.resolve(),
  sparql: () => Promise.resolve(null),
  search: () => Promise.resolve([]),
  import: () => Promise.resolve(),
  export: () => Promise.resolve(new ArrayBuffer(0)),
  getServiceDescription: () => Promise.resolve("{}"),
  listLogs: () => Promise.resolve([]),
};

function createMockWorlds(
  overrides?: Partial<
    {
      [K in keyof WorldsInterface]?: WorldsInterface[K];
    }
  >,
): WorldsInterface {
  return { ...mockWorldsBase, ...overrides } as WorldsInterface;
}

Deno.test("sparql tool", async (t) => {
  const sources: string[] = [];

  await t.step("executes SELECT query successfully", async () => {
    const mockWorlds = createMockWorlds({
      sparql: () =>
        Promise.resolve({
          head: { vars: ["s", "p", "o"], link: null },
          results: { bindings: [] },
        }),
    });
    const result = await sparql(mockWorlds, sources, {
      world: "test-world",
      query: "SELECT * WHERE { ?s ?p ?o }",
    });
    assertExists(result);
    assertEquals((result as { head: { vars: string[] } }).head.vars, [
      "s",
      "p",
      "o",
    ]);
  });

  await t.step(
    "executes INSERT DATA successfully with writable source",
    async () => {
      const mockWorlds = createMockWorlds({
        sparql: () => Promise.resolve(null),
      });
      const writableSources = [{ world: "test-world", write: true }];
      const result = await sparql(mockWorlds, writableSources as never, {
        world: "test-world",
        query: "INSERT DATA { <http://s> <http://p> <http://o> }",
      });
      assertEquals(result, null);
    },
  );

  await t.step("throws on write operation with read-only source", async () => {
    const sources = [{ world: "test-world", write: false }];
    await assertRejects(
      () =>
        sparql(createMockWorlds(), sources as never, {
          world: "test-world",
          query: "INSERT DATA { <http://s> <http://p> <http://o> }",
        }),
      Error,
      "Write operations are disabled",
    );
  });

  await t.step("tool definition has correct shape", () => {
    assertEquals(worldsSparqlTool.name, "worlds_sparql");
    assertExists(worldsSparqlTool.description);
    assertExists(worldsSparqlTool.inputSchema);
    assertExists(worldsSparqlTool.outputSchema);
  });
});

Deno.test("list tool", async (t) => {
  await t.step("returns list of worlds", async () => {
    const mockWorlds = createMockWorlds({
      list: () =>
        Promise.resolve([
          createMockWorld({ id: "1", slug: "world-1", label: "World 1" }),
          createMockWorld({ id: "2", slug: "world-2", label: "World 2" }),
        ]),
    });
    const result = await list(mockWorlds, { page: 1, pageSize: 10 });
    assertEquals(result.worlds.length, 2);
    assertEquals(result.worlds[0].slug, "world-1");
  });

  await t.step("tool definition has correct shape", () => {
    assertEquals(worldsListTool.name, "worlds_list");
    assertExists(worldsListTool.description);
    assertExists(worldsListTool.inputSchema);
    assertExists(worldsListTool.outputSchema);
  });
});

Deno.test("get tool", async (t) => {
  await t.step("returns world by ID", async () => {
    const mockWorld = createMockWorld({ label: "Test World" });
    const mockWorlds = createMockWorlds({
      get: () => Promise.resolve(mockWorld),
    });
    const result = await get(mockWorlds, { world: "test-id" });
    assertEquals(result.id, "test-id");
    assertEquals(result.label, "Test World");
  });

  await t.step("throws when world not found", async () => {
    const mockWorlds = createMockWorlds({
      get: () => Promise.resolve(null),
    });
    await assertRejects(
      () => get(mockWorlds, { world: "nonexistent" }),
      Error,
      "World not found",
    );
  });

  await t.step("tool definition has correct shape", () => {
    assertEquals(worldsGetTool.name, "worlds_get");
    assertExists(worldsGetTool.description);
    assertExists(worldsGetTool.inputSchema);
    assertExists(worldsGetTool.outputSchema);
  });
});

Deno.test("create tool", async (t) => {
  await t.step("creates world with required fields", async () => {
    const mockWorlds = createMockWorlds({
      create: (input: WorldsCreateInput) =>
        Promise.resolve(
          createMockWorld({
            slug: input.slug,
            label: input.label,
            description: input.description ?? null,
          }),
        ),
    });
    const result = await create(mockWorlds, {
      slug: "new-world",
      label: "New World",
    });
    assertEquals(result.slug, "new-world");
    assertEquals(result.label, "New World");
  });

  await t.step("tool definition has correct shape", () => {
    assertEquals(worldsCreateTool.name, "worlds_create");
    assertExists(worldsCreateTool.description);
    assertExists(worldsCreateTool.inputSchema);
    assertExists(worldsCreateTool.outputSchema);
  });
});

Deno.test("update tool", async (t) => {
  await t.step("updates world description", async () => {
    let calledWith: WorldsUpdateInput | undefined;
    const mockWorlds = createMockWorlds({
      update: (input: WorldsUpdateInput) => {
        calledWith = input;
        return Promise.resolve();
      },
    });
    await update(mockWorlds, {
      world: "test-id",
      description: "Updated description",
    });
    assertEquals(calledWith?.world, "test-id");
    assertEquals(calledWith?.description, "Updated description");
  });

  await t.step("tool definition has correct shape", () => {
    assertEquals(worldsUpdateTool.name, "worlds_update");
    assertExists(worldsUpdateTool.description);
    assertExists(worldsUpdateTool.inputSchema);
    assertExists(worldsUpdateTool.outputSchema);
  });
});

Deno.test("delete tool", async (t) => {
  await t.step("deletes world by ID", async () => {
    let calledWith: WorldsDeleteInput | undefined;
    const mockWorlds = createMockWorlds({
      delete: (input: WorldsDeleteInput) => {
        calledWith = input;
        return Promise.resolve();
      },
    });
    await deleteWorld(mockWorlds, { world: "test-id" });
    assertEquals(calledWith?.world, "test-id");
  });

  await t.step("tool definition has correct shape", () => {
    assertEquals(worldsDeleteTool.name, "worlds_delete");
    assertExists(worldsDeleteTool.description);
    assertExists(worldsDeleteTool.inputSchema);
    assertExists(worldsDeleteTool.outputSchema);
  });
});

Deno.test("search tool", async (t) => {
  await t.step("returns search results", async () => {
    const mockResults: WorldsSearchOutput[] = [
      {
        subject: "http://example.org/s",
        predicate: "http://example.org/p",
        object: "Test object",
        vecRank: 1,
        ftsRank: 1,
        score: 1.0,
      },
    ];
    const mockWorlds = createMockWorlds({
      search: () => Promise.resolve(mockResults),
    });
    const result = await search(mockWorlds, {
      world: "test-world",
      query: "test query",
    });
    assertEquals(result.results.length, 1);
    assertEquals(result.results[0].object, "Test object");
  });

  await t.step("respects limit parameter", async () => {
    const mockWorlds = createMockWorlds({
      search: () => Promise.resolve([]),
    });
    const result = await search(mockWorlds, {
      world: "test-world",
      query: "test",
      limit: 5,
    });
    assertEquals(result.results.length, 0);
  });

  await t.step("tool definition has correct shape", () => {
    assertEquals(worldsSearchTool.name, "worlds_search");
    assertExists(worldsSearchTool.description);
    assertExists(worldsSearchTool.inputSchema);
    assertExists(worldsSearchTool.outputSchema);
  });
});

Deno.test("import tool", async (t) => {
  await t.step("imports RDF data", async () => {
    let calledWith: WorldsImportInput | undefined;
    const mockWorlds = createMockWorlds({
      import: (input: WorldsImportInput) => {
        calledWith = input;
        return Promise.resolve();
      },
    });
    const turtleData =
      '<http://example.org/s> <http://example.org/p> "object" .';
    await importData(mockWorlds, {
      world: "test-world",
      data: turtleData,
      contentType: "text/turtle",
    });
    assertEquals(calledWith?.world, "test-world");
    assertEquals(calledWith?.contentType, "text/turtle");
  });

  await t.step("tool definition has correct shape", () => {
    assertEquals(worldsImportTool.name, "worlds_import");
    assertExists(worldsImportTool.description);
    assertExists(worldsImportTool.inputSchema);
    assertExists(worldsImportTool.outputSchema);
  });
});

Deno.test("export tool", async (t) => {
  await t.step("exports world as n-quads by default", async () => {
    const mockData =
      "<http://example.org/s> <http://example.org/p> <http://example.org/o> .";
    const mockWorlds = createMockWorlds({
      export: () => Promise.resolve(new TextEncoder().encode(mockData).buffer),
    });
    const result = await exportData(mockWorlds, { world: "test-world" });
    assertEquals(result.data.includes("http://example.org/s"), true);
  });

  await t.step("exports world as turtle", async () => {
    let calledWith: WorldsExportInput | undefined;
    const mockWorlds = createMockWorlds({
      export: (input: WorldsExportInput) => {
        calledWith = input;
        return Promise.resolve(new ArrayBuffer(0));
      },
    });
    await exportData(mockWorlds, {
      world: "test-world",
      contentType: "text/turtle",
    });
    assertEquals(calledWith?.contentType, "text/turtle");
  });

  await t.step("tool definition has correct shape", () => {
    assertEquals(worldsExportTool.name, "worlds_export");
    assertExists(worldsExportTool.description);
    assertExists(worldsExportTool.inputSchema);
    assertExists(worldsExportTool.outputSchema);
  });
});

Deno.test("logs tool", async (t) => {
  await t.step("returns logs for world", async () => {
    const mockLogs: Log[] = [
      {
        id: "log-1",
        worldId: "test-world",
        level: "info",
        message: "Test log entry",
        timestamp: Date.now(),
        metadata: null,
      },
    ];
    const mockWorlds = createMockWorlds({
      listLogs: () => Promise.resolve(mockLogs),
    });
    const result = await listLogs(mockWorlds, { world: "test-world" });
    assertEquals(result.logs.length, 1);
    assertEquals(result.logs[0].level, "info");
  });

  await t.step("respects pagination parameters", async () => {
    const mockWorlds = createMockWorlds({
      listLogs: () => Promise.resolve([]),
    });
    const result = await listLogs(mockWorlds, {
      world: "test-world",
      page: 1,
      pageSize: 10,
    });
    assertEquals(result.logs.length, 0);
  });

  await t.step("tool definition has correct shape", () => {
    assertEquals(worldsLogsTool.name, "worlds_logs");
    assertExists(worldsLogsTool.description);
    assertExists(worldsLogsTool.inputSchema);
    assertExists(worldsLogsTool.outputSchema);
  });
});
