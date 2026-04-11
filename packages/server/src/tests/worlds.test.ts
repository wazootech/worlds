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

  let slug: string;

  await t.step("create world", async () => {
    const world = await worlds.create({
      slug: "sdk-world",
      label: "SDK World",
      description: "Test World",
    });
    assert(world.slug !== undefined);
    assertEquals(world.label, "SDK World");
    slug = world.slug;
  });

  await t.step("list worlds pagination", async () => {
    await worlds.create({
      slug: "world-1",
      label: "World 1",
    });
    await worlds.create({
      slug: "world-2",
      label: "World 2",
    });

    const page1 = await worlds.list({
      page: 1,
      pageSize: 1,
    });
    assertEquals(page1.length, 1);

    const page2 = await worlds.list({
      page: 2,
      pageSize: 1,
    });
    assertEquals(page2.length, 1);
    assert(page1[0].slug !== page2[0].slug);
  });

  await t.step("get world", async () => {
    const world = await worlds.get({ slug });
    assert(world !== null);
    assertEquals(world.label, "SDK World");
  });

  await t.step("update world", async () => {
    await worlds.update({
      slug,
      description: "Updated Description",
    });
    const world = await worlds.get({ slug });
    assert(world !== null);
    assertEquals(world.description, "Updated Description");
  });

  await t.step("sparql update", async () => {
    const updateQuery = `
    INSERT DATA {
      <http://example.org/subject> <http://example.org/predicate> "Update Object" .
    }
  `;
    const result = await worlds.sparql({ slug: slug, query: updateQuery });
    assertEquals(result, null);
  });

  await t.step("sparql query", async () => {
    const selectQuery = `
    SELECT ?s ?p ?o WHERE {
      <http://example.org/subject> <http://example.org/predicate> ?o
    }
  `;
    const result = (await worlds.sparql({
      slug: slug,
      query: selectQuery,
    })) as SparqlSelectResults;
    assert(result.results.bindings.length > 0);
    assertEquals(result.results.bindings[0].o.value, "Update Object");
  });

  await t.step("search world", async () => {
    // Add more diverse data for testing search params
    await worlds.sparql({
      slug: slug,
      query: `
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
    });

    // 1. Basic search
    const results = await worlds.search({
      slug: slug,
      query: "Update Object",
    });
    assert(results.length > 0);
    assertEquals(results[0].object, "Update Object");

    // 2. Search with limit
    const limitResults = await worlds.search({
      slug: slug,
      query: "",
      limit: 1,
    });
    assertEquals(limitResults.length, 1);

    // 3. Search with subjects filter
    const subjectResults = await worlds.search({
      slug: slug,
      query: "",
      subjects: ["http://example.org/alice"],
    });
    assert(subjectResults.length > 0);
    assert(
      subjectResults.every((r) => r.subject === "http://example.org/alice"),
    );

    // 4. Search with predicates filter
    const predicateResults = await worlds.search({
      slug: slug,
      query: "",
      predicates: ["http://example.org/name"],
    });
    assert(predicateResults.length > 0);
    assert(
      predicateResults.every((r) => r.predicate === "http://example.org/name"),
    );

    // 5. Search with types filter
    const typeResults = await worlds.search({
      slug: slug,
      query: "",
      types: ["http://example.org/Vehicle"],
    });
    assert(typeResults.length > 0);
    assert(typeResults.every((r) => r.subject === "http://example.org/car"));

    // 6. Search with combined filters
    const combinedResults = await worlds.search({
      slug: slug,
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
    const nQuadsBuffer = await worlds.export({ slug: slug });
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject"));

    // 3. Export in Turtle format
    const turtleBuffer = await worlds.export({
      slug: slug,
      contentType: "text/turtle",
    });
    const turtle = new TextDecoder().decode(turtleBuffer);
    assert(turtle.includes("<http://example.org/subject>"));
  });

  await t.step("import world", async () => {
    const turtleData =
      '<http://example.org/subject2> <http://example.org/predicate> "Imported Object" .';
    await worlds.import({
      slug: slug,
      data: turtleData,
      contentType: "text/turtle",
    });

    const nQuadsBuffer = await worlds.export({ slug: slug });
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject2"));
    assert(nQuads.includes("Imported Object"));
  });


  await t.step("delete world", async () => {
    await worlds.delete({ slug: slug });
    const world = await worlds.get({ slug: slug });
    assertEquals(world, null);
  });
});


