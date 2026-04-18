import { assert, assertEquals } from "@std/assert";
import {
  createTestContext,
  LocalWorlds,
  RemoteWorlds as Worlds,
} from "@wazoo/worlds-sdk";
import type { SparqlSelectResults } from "@wazoo/worlds-sdk/schema";
import { createServer } from "../server.ts";

Deno.test("World routes", async (t) => {
  await using appContext = await createTestContext();
  await using engine = new LocalWorlds(appContext);
  appContext.engine = engine;
  await engine.init();
  const server = await createServer(appContext);

  // Use the admin API key for setup
  // This shows how to use the server.fetch as a fetcher for the SDK
  const worlds = new Worlds({
    baseUrl: "http://localhost",
    apiKey: appContext.apiKey!,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  let world: string | null;

  await t.step("create world", async () => {
    const createdWorld = await worlds.create({
      name: "sdk-world",
      label: "SDK World",
      description: "Test World",
    });
    assert(createdWorld.world !== undefined);
    assertEquals(createdWorld.label, "SDK World");
    world = createdWorld.world;
  });

  await t.step("list worlds pagination", async () => {
    // Ensure unique timestamps
    await new Promise((r) => setTimeout(r, 10));
    await worlds.create({
      name: "world-1",
      label: "World 1",
    });
    await new Promise((r) => setTimeout(r, 10));
    await worlds.create({
      name: "world-2",
      label: "World 2",
    });

    const list1 = await worlds.list({
      pageSize: 1,
    });
    assertEquals(list1.length, 1);
    const world1 = list1[0].world;

    // We don't have an easy way to get the token from the SDK currently
    // because list returns World[] instead of { worlds, nextPageToken }.
    // TODO: Update SDK list return type to include token.
    // For now, let's just test that list works and we can skip the token test
    // or just list more.
    const all = await worlds.list({ pageSize: 10 });
    assert(all.length >= 3); // sdk-world, world-1, world-2
  });

  await t.step("get world", async () => {
    const result = await worlds.get({ source: { world } });
    assert(result !== null);
    assertEquals(result.label, "SDK World");
  });

  await t.step("update world", async () => {
    await worlds.update({
      source: { world },
      description: "Updated Description",
    });
    const result = await worlds.get({ source: { world } });
    assert(result !== null);
    assertEquals(result.description, "Updated Description");
  });

  await t.step("sparql update", async () => {
    const updateQuery = `
    INSERT DATA {
      <http://example.org/subject> <http://example.org/predicate> "Update Object" .
    }
  `;
    const result = await worlds.sparql({
      sources: [{ world }],
      query: updateQuery,
    });
    assertEquals(result, null);
  });

  await t.step("sparql query", async () => {
    const selectQuery = `
    SELECT ?s ?p ?o WHERE {
      <http://example.org/subject> <http://example.org/predicate> ?o
    }
  `;
    const result = (await worlds.sparql({
      sources: [{ world }],
      query: selectQuery,
    })) as SparqlSelectResults;
    assert(result.results.bindings.length > 0);
    assertEquals(result.results.bindings[0].o.value, "Update Object");
  });

  await t.step("search world", async () => {
    // Seed diverse data via import to ensure indexing
    await worlds.import({
      source: { world },
      data: `
        <http://example.org/subject> <http://example.org/predicate> "Update Object" .
        <http://example.org/alice> a <http://example.org/Person> ;
                                    <http://example.org/name> "Alice" ;
                                    <http://example.org/age> "25" ;
                                    <http://example.org/knows> <http://example.org/bob> .
        <http://example.org/bob> a <http://example.org/Person> ;
                                  <http://example.org/name> "Bob" ;
                                  <http://example.org/age> "30" .
        <http://example.org/car> a <http://example.org/Vehicle> ;
                                  <http://example.org/model> "Tesla" .
      `,
      contentType: "text/turtle",
    });

    // 1. Basic search
    const results = await worlds.search({
      sources: [{ world }],
      query: "Update Object",
    });
    assert(results.length > 0);
    assertEquals(results[0].object, "Update Object");

    // 2. Search with limit
    const limitResults = await worlds.search({
      sources: [{ world }],
      query: "",
      limit: 1,
    });
    assertEquals(limitResults.length, 1);

    // 3. Search with subjects filter
    const subjectResults = await worlds.search({
      sources: [{ world }],
      query: "",
      subjects: ["http://example.org/alice"],
    });
    assert(subjectResults.length > 0);
    assert(
      subjectResults.every((r) => r.subject === "http://example.org/alice"),
    );

    // 4. Search with predicates filter
    const predicateResults = await worlds.search({
      sources: [{ world }],
      query: "",
      predicates: ["http://example.org/name"],
    });
    assert(predicateResults.length > 0);
    assert(
      predicateResults.every((r) => r.predicate === "http://example.org/name"),
    );

    // 5. Search with types filter
    // Note: types filter relies on 'a' (rdf:type) triples being indexed
    const typeResults = await worlds.search({
      sources: [{ world }],
      query: "",
      types: ["http://example.org/Vehicle"],
    });
    assert(typeResults.length > 0);
    assert(typeResults.every((r) => r.subject === "http://example.org/car"));

    // 6. Search with combined filters
    const combinedResults = await worlds.search({
      sources: [{ world }],
      query: "Tesla",
      types: ["http://example.org/Vehicle"],
      predicates: ["http://example.org/model"],
    });
    assertEquals(combinedResults.length, 1);
    assertEquals(combinedResults[0].object, "Tesla");
  });

  await t.step("export world", async () => {
    // 1. Add some data if not already there (should be there from previous steps)
    // 2. Export in default format (N-Quads)
    const nQuadsBuffer = await worlds.export({ source: { world } });
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject"));

    // 3. Export in Turtle format
    const turtleBuffer = await worlds.export({
      source: { world },
      contentType: "text/turtle",
    });
    const turtle = new TextDecoder().decode(turtleBuffer);
    assert(turtle.includes("<http://example.org/subject>"));
  });

  await t.step("import world", async () => {
    const turtleData =
      '<http://example.org/subject2> <http://example.org/predicate> "Imported Object" .';
    await worlds.import({
      source: { world },
      data: turtleData,
      contentType: "text/turtle",
    });

    const nQuadsBuffer = await worlds.export({ source: { world } });
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject2"));
    assert(nQuads.includes("Imported Object"));
  });

  await t.step("delete world", async () => {
    await worlds.delete({ source: { world } });
    const result = await worlds.get({ source: { world } });
    assertEquals(result, null);
  });
});
