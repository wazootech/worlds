import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import type { WorldsEngine } from "@wazoo/worlds-sdk";
import type {
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  ImportWorldRequest,
  UpdateWorldRequest,
} from "@wazoo/worlds-sdk";
import type { SearchWorldsResult, World } from "@wazoo/worlds-sdk";

import { sparql, worldsSparqlTool } from "./tools/sparql.ts";
import { search, worldsSearchTool } from "./tools/search.ts";
import { list, worldsListTool } from "./tools/list.ts";
import { get, worldsGetTool } from "./tools/get.ts";
import { create, worldsCreateTool } from "./tools/create.ts";
import { update, worldsUpdateTool } from "./tools/update.ts";
import { deleteWorld, worldsDeleteTool } from "./tools/delete.ts";
import { importWorld, worldsImportTool } from "./tools/import.ts";
import { exportWorld, worldsExportTool } from "./tools/export.ts";

function createMockWorld(overrides?: Partial<World>): World {
  const now = Date.now();
  return {
    name: "worlds/test",
    id: "test",
    namespace: undefined,
    displayName: "Test",
    description: undefined,
    createTime: now,
    updateTime: now,
    deleteTime: undefined,
    ...overrides,
  };
}

const mockWorldsBase: WorldsEngine = {
  list: () => Promise.resolve({ worlds: [], nextPageToken: undefined }),
  get: () => Promise.resolve(null),
  create: () => Promise.resolve(createMockWorld()),
  update: () => Promise.resolve(createMockWorld()),
  delete: () => Promise.resolve(),
  sparql: () => Promise.resolve(null),
  search: () => Promise.resolve({ results: [], nextPageToken: undefined }),
  import: () => Promise.resolve(),
  export: () => Promise.resolve(new ArrayBuffer(0)),

  init: () => Promise.resolve(),
  [Symbol.asyncDispose]: () => Promise.resolve(),
};

function createMockWorlds(
  overrides?: Partial<
    {
      [K in keyof WorldsEngine]?: WorldsEngine[K];
    }
  >,
): WorldsEngine {
  return { ...mockWorldsBase, ...overrides } as WorldsEngine;
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
      sources: ["test-world"],
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
      const writableSources = [{ id: "test-world", mode: "write" }];
      const result = await sparql(mockWorlds, writableSources as never, {
        sources: [{ id: "test-world", mode: "write" }],
        query: "INSERT DATA { <http://s> <http://p> <http://o> }",
      });
      assertEquals(result, null);
    },
  );

  await t.step("throws on write operation with read-only source", async () => {
    const sources = [{ id: "test-world", mode: "read" }];
    await assertRejects(
      () =>
        sparql(createMockWorlds(), sources as never, {
          sources: ["test-world"],
          query: "INSERT DATA { <http://s> <http://p> <http://o> }",
        }),
      Error,
      "is not writable",
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
        Promise.resolve({
          worlds: [
            createMockWorld({ id: "world-1", displayName: "World 1" }),
            createMockWorld({ id: "world-2", displayName: "World 2" }),
          ],
          nextPageToken: undefined,
        }),
    });
    const result = await list(mockWorlds, { pageToken: "1", pageSize: 10 });
    assertEquals(result.worlds.length, 2);
    assertEquals(result.worlds[0].id, "world-1");
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
    const mockWorld = createMockWorld({
      displayName: "Test World",
      id: "test-id",
    });
    const mockWorlds = createMockWorlds({
      get: () => Promise.resolve(mockWorld),
    });
    const result = await get(mockWorlds, { source: "test-id" });
    assertEquals(result!.id, "test-id");
    assertEquals(result!.displayName, "Test World");
  });

  await t.step("throws when world not found", async () => {
    const mockWorlds = createMockWorlds({
      get: () => Promise.resolve(null),
    });
    await assertRejects(
      () => get(mockWorlds, { source: "nonexistent" }),
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
      create: (input: CreateWorldRequest) =>
        Promise.resolve(
          createMockWorld({
            id: input.id,
            displayName: input.displayName,
            description: input.description ?? undefined,
          }),
        ),
    });
    const result = await create(mockWorlds, {
      id: "new-world",
      displayName: "New World",
    });
    assertEquals(result.id, "new-world");
    assertEquals(result.displayName, "New World");
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
    let calledWith: UpdateWorldRequest | undefined;
    const mockWorlds = createMockWorlds({
      update: (input: UpdateWorldRequest) => {
        calledWith = input;
        return Promise.resolve(createMockWorld());
      },
    });
    await update(mockWorlds, {
      source: "test-id",
      description: "Updated description",
    });
    assertEquals(calledWith?.source, "test-id");
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
    let calledWith: DeleteWorldRequest | undefined;
    const mockWorlds = createMockWorlds({
      delete: (input: DeleteWorldRequest) => {
        calledWith = input;
        return Promise.resolve();
      },
    });
    await deleteWorld(mockWorlds, { source: "test-id" });
    assertEquals(calledWith?.source, "test-id");
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
    const mockResults: SearchWorldsResult[] = [
      {
        subject: "http://example.org/s",
        predicate: "http://example.org/p",
        object: "Test object",
        vecRank: 1,
        ftsRank: 1,
        score: 1.0,
        world: createMockWorld(),
      },
    ];
    const mockWorlds = createMockWorlds({
      search: () =>
        Promise.resolve({ results: mockResults, nextPageToken: undefined }),
    });
    const result = await search(mockWorlds, {
      sources: ["test-world"],
      query: "test query",
    });
    assertEquals(result.results.length, 1);
    assertEquals(result.results[0].object, "Test object");
  });

  await t.step("respects limit parameter", async () => {
    const mockWorlds = createMockWorlds({
      search: () => Promise.resolve({ results: [], nextPageToken: undefined }),
    });
    const result = await search(mockWorlds, {
      sources: ["test-world"],
      query: "test",
      pageSize: 5,
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
    let calledWith: ImportWorldRequest | undefined;
    const mockWorlds = createMockWorlds({
      import: (input: ImportWorldRequest) => {
        calledWith = input;
        return Promise.resolve();
      },
    });
    const turtleData =
      '<http://example.org/s> <http://example.org/p> "object" .';
    await importWorld(mockWorlds, {
      source: "test-world",
      data: turtleData,
      contentType: "text/turtle",
    });
    assertEquals(calledWith?.source, "test-world");
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
    const result = await exportWorld(mockWorlds, { source: "test-world" });
    const text = new TextDecoder().decode(result as ArrayBuffer);
    assert(text.includes("http://example.org/s"));
  });

  await t.step("exports world as turtle", async () => {
    let calledWith: ExportWorldRequest | undefined;
    const mockWorlds = createMockWorlds({
      export: (input: ExportWorldRequest) => {
        calledWith = input;
        return Promise.resolve(new ArrayBuffer(0));
      },
    });
    await exportWorld(mockWorlds, {
      source: "test-world",
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
