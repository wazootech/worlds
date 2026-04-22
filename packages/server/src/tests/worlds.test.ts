import { assert, assertEquals } from "@std/assert";
import {
  initRegistry,
  LocalWorlds,
  WorldsClient as Worlds,
} from "@wazoo/worlds-sdk";
import type { SparqlSelectResult } from "@wazoo/worlds-sdk/schema";
import { createServer } from "../server.ts";

Deno.test("World routes", async (t) => {
  await using registry = await initRegistry();
  // Mock embeddings to avoid external API calls
  registry.embeddings = {
    dimensions: 768,
    embed: (texts: string | string[]) => {
      if (Array.isArray(texts)) {
        return Promise.resolve(Array(texts.length).fill(Array(768).fill(1)));
      }
      return Promise.resolve(Array(768).fill(1));
    },
  };
  await using engine = await registry.engine();
  await engine.init();
  const server = await createServer(registry);

  // Use the admin API key for setup
  // This shows how to use the server.fetch as a fetcher for the SDK
  const worlds = new Worlds({
    baseUrl: "http://localhost",
    apiKey: registry.apiKey,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  let world: string | null;

  await t.step("create world", async () => {
    const createdWorld = await worlds.management.createWorld({
      id: "sdk-world",
      displayName: "SDK World",
      description: "Test World",
    });
    assert(createdWorld.id !== undefined);
    assertEquals(createdWorld.displayName, "SDK World");
    world = createdWorld.id;
  });

  await t.step("list worlds pagination", async () => {
    // Ensure unique timestamps
    await new Promise((r) => setTimeout(r, 10));
    await worlds.management.createWorld({
      id: "world-1",
      displayName: "World 1",
    });
    await new Promise((r) => setTimeout(r, 10));
    await worlds.management.createWorld({
      id: "world-2",
      displayName: "World 2",
    });

    const list1 = await worlds.management.listWorlds({
      pageSize: 1,
    });
    assertEquals(list1.worlds.length, 1);

    // We don't have an easy way to get the token from the SDK currently
    // because list returns World[] instead of { worlds, nextPageToken }.
    // TODO: Update SDK list return type to include token.
    // For now, let's just test that list works and we can skip the token test
    // or just list more.
    const all = await worlds.management.listWorlds({ pageSize: 10 });
    assert(all.worlds.length >= 3); // sdk-world, world-1, world-2
  });

  await t.step("get world", async () => {
    const result = await worlds.management.getWorld({ source: { id: world! } });
    assert(result !== null);
    assertEquals(result.displayName, "SDK World");
  });

  await t.step("update world", async () => {
    await worlds.management.updateWorld({
      source: { id: world! },
      description: "Updated Description",
    });
    const result = await worlds.management.getWorld({ source: { id: world! } });
    assert(result !== null);
    assertEquals(result.description, "Updated Description");
  });

  await t.step("sparql update", async () => {
    const updateQuery = `
    INSERT DATA {
      <http://example.org/subject> <http://example.org/predicate> "Update Object" .
    }
  `;
    const result = await worlds.worlds.sparql({
      sources: [{ id: world! }],
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
    const result = (await worlds.worlds.sparql({
      sources: [{ id: world! }],
      query: selectQuery,
    })) as SparqlSelectResult;
    assert(result.results.bindings.length > 0);
    assertEquals(result.results.bindings[0].o.value, "Update Object");
  });

  await t.step("search world", async () => {
    // Seed diverse data via import to ensure indexing
    await worlds.worlds.import({
      source: { id: world! },
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
    const results = await worlds.worlds.search({
      sources: [{ id: world! }],
      query: "Update Object",
    });
    assert(results.results.length > 0);
    assertEquals(results.results[0].object, "Update Object");

    // 2. Search with limit
    const limitResults = await worlds.worlds.search({
      sources: [{ id: world! }],
      query: "",
      pageSize: 1,
    });
    assertEquals(limitResults.results.length, 1);

    // 3. Search with subjects filter
    const subjectResults = await worlds.worlds.search({
      sources: [{ id: world! }],
      query: "",
      subjects: ["http://example.org/alice"],
    });
    assert(subjectResults.results.length > 0);
    assert(
      subjectResults.results.every((r: Record<string, unknown>) =>
        r.subject === "http://example.org/alice"
      ),
    );

    // 4. Search with predicates filter
    const predicateResults = await worlds.worlds.search({
      sources: [{ id: world! }],
      query: "",
      predicates: ["http://example.org/name"],
    });
    assert(predicateResults.results.length > 0);
    assert(
      predicateResults.results.every((r: Record<string, unknown>) =>
        r.predicate === "http://example.org/name"
      ),
    );

    // 5. Search with types filter
    // Note: types filter relies on 'a' (rdf:type) triples being indexed
    const typeResults = await worlds.worlds.search({
      sources: [{ id: world! }],
      query: "",
      types: ["http://example.org/Vehicle"],
    });
    assert(typeResults.results.length > 0);
    assert(
      typeResults.results.every((r: Record<string, unknown>) =>
        r.subject === "http://example.org/car"
      ),
    );

    // 6. Search with combined filters
    const combinedResults = await worlds.worlds.search({
      sources: [{ id: world! }],
      query: "Tesla",
      types: ["http://example.org/Vehicle"],
      predicates: ["http://example.org/model"],
    });
    assertEquals(combinedResults.results.length, 1);
    assertEquals(combinedResults.results[0].object, "Tesla");
  });

  await t.step("export world", async () => {
    // 1. Add some data if not already there (should be there from previous steps)
    // 2. Export in default format (N-Quads)
    const nQuadsBuffer = await worlds.worlds.export({ source: { id: world! } });
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject"));

    // 3. Export in Turtle format
    const turtleBuffer = await worlds.worlds.export({
      source: { id: world! },
      contentType: "text/turtle",
    });
    const turtle = new TextDecoder().decode(turtleBuffer);
    assert(turtle.includes("<http://example.org/subject>"));
  });

  await t.step("import world", async () => {
    const turtleData =
      '<http://example.org/subject2> <http://example.org/predicate> "Imported Object" .';
    await worlds.worlds.import({
      source: { id: world! },
      data: turtleData,
      contentType: "text/turtle",
    });

    const nQuadsBuffer2 = await worlds.worlds.export({ source: { id: world! } });
    const nQuads2 = new TextDecoder().decode(nQuadsBuffer2);
    assert(nQuads2.includes("http://example.org/subject2"));
    assert(nQuads2.includes("Imported Object"));
  });

  await t.step("delete world", async () => {
    await worlds.management.deleteWorld({ source: { id: world! } });
    const result = await worlds.management.getWorld({ source: { id: world! } });
    assertEquals(result, null);
  });
});
