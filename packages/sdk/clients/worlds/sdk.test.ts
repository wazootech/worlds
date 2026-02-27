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
    apiKey: appContext.apiKey!,
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
    // Add more diverse data for testing search params
    await sdk.worlds.sparql(
      worldId,
      `
      INSERT DATA {
        <http://example.org/alice> a <http://example.org/Person> ;
                                    <http://example.org/name> "Alice" ;
                                    <http://example.org/age> "25" ;
                                    <http://example.org/knows> <http://example.org/bob> .
        <http://example.org/bob> a <http://example.org/Person> ;
                                  <http://example.org/name> "Bob" ;
                                  <http://example.org/age> "30" .
        <http://example.org/car> a <http://example.org/Vehicle> ;
                                  <http://example.org/model> "Tesla" .
      }
    `,
    );

    // 1. Basic search
    const results = await sdk.worlds.search(worldId, "Update Object");
    assert(results.length > 0);
    assertEquals(results[0].object, "Update Object");

    // 2. Search with limit
    const limitResults = await sdk.worlds.search(worldId, "", { limit: 1 });
    assertEquals(limitResults.length, 1);

    // 3. Search with subjects filter
    const subjectResults = await sdk.worlds.search(worldId, "", {
      subjects: ["http://example.org/alice"],
    });
    assert(subjectResults.length > 0);
    assert(
      subjectResults.every((r) => r.subject === "http://example.org/alice"),
    );

    // 4. Search with predicates filter
    const predicateResults = await sdk.worlds.search(worldId, "", {
      predicates: ["http://example.org/name"],
    });
    assert(predicateResults.length > 0);
    assert(
      predicateResults.every((r) => r.predicate === "http://example.org/name"),
    );

    // 5. Search with types filter
    const typeResults = await sdk.worlds.search(worldId, "", {
      types: ["http://example.org/Vehicle"],
    });
    assert(typeResults.length > 0);
    assert(typeResults.every((r) => r.subject === "http://example.org/car"));

    // 6. Search with combined filters
    const combinedResults = await sdk.worlds.search(worldId, "Tesla", {
      types: ["http://example.org/Vehicle"],
      predicates: ["http://example.org/model"],
    });
    assertEquals(combinedResults.length, 1);
    assertEquals(combinedResults[0].object, "Tesla");
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
