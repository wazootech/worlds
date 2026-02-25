import { assert, assertEquals, assertExists } from "@std/assert";
import { createServer } from "@wazoo/worlds-server";
import { createTestContext } from "@wazoo/worlds-server/testing";
import type { SparqlSelectResults } from "./schema.ts";
import { WorldsSdk } from "#/sdk.ts";

Deno.test("WorldsSdk - Worlds", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);

  // Use the admin API key for setup
  // This shows how to use the server.fetch as a fetcher for the SDK
  const sdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  let worldId: string;

  await t.step("create world", async () => {
    const world = await sdk.worlds.create({
      slug: "sdk-world",
      label: "SDK World",
      description: "Test World",
    });
    assert(world.id !== undefined);
    assertEquals(world.label, "SDK World");
    worldId = world.id;
  });

  await t.step("get world", async () => {
    const world = await sdk.worlds.get(worldId);
    assert(world !== null);
    assertEquals(world.label, "SDK World");
  });

  await t.step("list worlds pagination", async () => {
    // Create more worlds for pagination
    await sdk.worlds.create({
      slug: "world-1",
      label: "World 1",
    });
    await sdk.worlds.create({
      slug: "world-2",
      label: "World 2",
    });

    const page1 = await sdk.worlds.list({
      page: 1,
      pageSize: 1,
    });
    assertEquals(page1.length, 1);

    const page2 = await sdk.worlds.list({
      page: 2,
      pageSize: 1,
    });
    assertEquals(page2.length, 1);
    assert(page1[0].id !== page2[0].id);
  });

  await t.step("update world", async () => {
    await sdk.worlds.update(worldId, {
      description: "Updated Description",
    });
    const world = await sdk.worlds.get(worldId);
    assert(world !== null);
    assertEquals(world.description, "Updated Description");
  });

  await t.step("sparql update", async () => {
    const updateQuery = `
      INSERT DATA {
        <http://example.org/subject> <http://example.org/predicate> "Update Object" .
      }
    `;
    const result = await sdk.worlds.sparql(worldId, updateQuery);
    assertEquals(result, null);
  });

  await t.step("sparql query", async () => {
    const selectQuery = `
      SELECT ?s ?p ?o WHERE {
        <http://example.org/subject> <http://example.org/predicate> ?o
      }
    `;
    const result = await sdk.worlds.sparql(
      worldId,
      selectQuery,
    ) as SparqlSelectResults;
    assert(result.results.bindings.length > 0);
    assertEquals(result.results.bindings[0].o.value, "Update Object");
  });

  await t.step("search world", async () => {
    const results = await sdk.worlds.search(worldId, "Update Object");
    assert(results.length > 0);
    assertEquals(results[0].object, "Update Object");
    assertEquals(results[0].subject, "http://example.org/subject");
  });

  await t.step("export world", async () => {
    // 1. Add some data if not already there (should be there from previous steps)
    // 2. Export in default format (N-Quads)
    const nQuadsBuffer = await sdk.worlds.export(worldId);
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject"));

    // 3. Export in Turtle format
    const turtleBuffer = await sdk.worlds.export(worldId, {
      format: "turtle",
    });
    const turtle = new TextDecoder().decode(turtleBuffer);
    assert(turtle.includes("<http://example.org/subject>"));
  });

  await t.step("import world", async () => {
    const turtleData =
      '<http://example.org/subject2> <http://example.org/predicate> "Imported Object" .';
    await sdk.worlds.import(worldId, turtleData, { format: "turtle" });

    const nQuadsBuffer = await sdk.worlds.export(worldId);
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject2"));
    assert(nQuads.includes("Imported Object"));
  });

  await t.step("list logs", async () => {
    // There should be some logs from previous operations (create, update, sparql, import)
    const logs = await sdk.worlds.listLogs(worldId);
    assert(logs.length > 0);
    assertEquals(logs[0].worldId, worldId);
    assertExists(logs[0].message);
    assertExists(logs[0].level);
    assertExists(logs[0].timestamp);
  });

  await t.step("delete world", async () => {
    await sdk.worlds.delete(worldId);
    const world = await sdk.worlds.get(worldId);
    assertEquals(world, null);
  });
});
