import { assertEquals } from "@std/assert";
import { EventEmitter } from "node:events";
import DataFactory from "@rdfjs/data-model";
import { Store } from "n3";
import type * as RDF from "@rdfjs/types";
import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import type { QueryAlgebraContext } from "@comunica/types";
import { createFactOrama, OramaSearchEngine } from "./orama-search-engine.ts";
import { syncOrama } from "./sync-orama.ts";

Deno.test("syncOrama inserts documents on import()", async () => {
  const { searchEngine, syncedStore } = setup();
  const quad = createQuad(
    "http://example.org/alice",
    "http://xmlns.com/foaf/0.1/name",
    "Alice",
  );

  syncedStore.import(createQuadStream([quad]));
  await flushAsync();

  const results = await searchEngine.searchFacts("Alice", 10);
  assertEquals(results.length, 1);
});

Deno.test("syncOrama removes documents on remove()", async () => {
  const { searchEngine, syncedStore } = setup();
  const quad = createQuad(
    "http://example.org/alice",
    "http://xmlns.com/foaf/0.1/name",
    "Alice",
  );

  syncedStore.import(createQuadStream([quad]));
  await flushAsync();
  assertEquals((await searchEngine.searchFacts("Alice", 10)).length, 1);

  syncedStore.remove(createQuadStream([quad]));
  await flushAsync();
  assertEquals((await searchEngine.searchFacts("Alice", 10)).length, 0);
});

Deno.test("syncOrama removes matching documents on removeMatches()", async () => {
  const { searchEngine, syncedStore } = setup();
  const aliceName = createQuad(
    "http://example.org/alice",
    "http://xmlns.com/foaf/0.1/name",
    "Alice",
  );
  const bobName = createQuad(
    "http://example.org/bob",
    "http://xmlns.com/foaf/0.1/name",
    "Bob",
  );

  syncedStore.import(createQuadStream([aliceName, bobName]));
  await flushAsync();

  syncedStore.removeMatches(
    DataFactory.namedNode("http://example.org/alice"),
    null,
    null,
    null,
  );
  await flushAsync();

  assertEquals((await searchEngine.searchFacts("Alice", 10)).length, 0);
  assertEquals((await searchEngine.searchFacts("Bob", 10)).length, 1);
});

Deno.test("syncOrama removes documents on deleteGraph()", async () => {
  const { searchEngine, syncedStore } = setup();
  const graphA = "http://example.org/graph/a";
  const graphB = "http://example.org/graph/b";
  const quadA = createQuad(
    "http://example.org/alice",
    "http://xmlns.com/foaf/0.1/name",
    "Alice",
    graphA,
  );
  const quadB = createQuad(
    "http://example.org/bob",
    "http://xmlns.com/foaf/0.1/name",
    "Bob",
    graphB,
  );

  syncedStore.import(createQuadStream([quadA, quadB]));
  await flushAsync();

  syncedStore.deleteGraph(DataFactory.namedNode(graphA));
  await flushAsync();

  assertEquals((await searchEngine.searchFacts("Alice", 10)).length, 0);
  assertEquals((await searchEngine.searchFacts("Bob", 10)).length, 1);
});

Deno.test("e2e: Comunica SPARQL INSERT syncs quads to Orama and makes them searchable", async () => {
  // Set up the complete system: N3 store + Orama sync + Comunica engine
  const rdfStore = new Store();
  const orama = createFactOrama();
  const searchEngine = new OramaSearchEngine(orama);
  const syncedStore = syncOrama(orama, rdfStore);

  // Set up Comunica query engine using the synced store
  const queryEngine = new QueryEngine();
  const context: QueryAlgebraContext = {
    sources: [syncedStore],
    destination: syncedStore,
  };

  // Execute SPARQL INSERT query via Comunica
  await queryEngine.queryVoid(
    `
    PREFIX ex: <http://example.org/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    INSERT DATA {
      ex:alice foaf:name "Alice" .
      ex:alice foaf:age "30" .
      ex:bob foaf:name "Bob" .
    }
  `,
    context,
  );

  // Wait for async sync to complete
  await flushAsync();

  // Verify quads are in the RDF/JS store (via SELECT query)
  const selectResult = await queryEngine.queryBindings(
    `
    PREFIX ex: <http://example.org/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?name WHERE {
      ?person foaf:name ?name .
    }
    ORDER BY ?name
  `,
    context,
  );

  const names: string[] = [];
  for await (const binding of selectResult) {
    const name = binding.get("name");
    if (name) {
      names.push(name.value);
    }
  }
  assertEquals(names.length, 2);
  assertEquals(names[0], "Alice");
  assertEquals(names[1], "Bob");

  // Verify quads are searchable in Orama
  const aliceResults = await searchEngine.searchFacts("Alice", 10);
  assertEquals(aliceResults.length, 1);
  assertEquals(aliceResults[0].object, "Alice");
  assertEquals(aliceResults[0].subject, "http://example.org/alice");

  const bobResults = await searchEngine.searchFacts("Bob", 10);
  assertEquals(bobResults.length, 1);
  assertEquals(bobResults[0].object, "Bob");
  assertEquals(bobResults[0].subject, "http://example.org/bob");
});

Deno.test("e2e: Comunica SPARQL DELETE removes quads from Orama", async () => {
  // Set up the complete system
  const rdfStore = new Store();
  const orama = createFactOrama();
  const searchEngine = new OramaSearchEngine(orama);
  const syncedStore = syncOrama(orama, rdfStore);

  const queryEngine = new QueryEngine();
  const context: QueryAlgebraContext = {
    sources: [syncedStore],
    destination: syncedStore,
  };

  // Insert data
  await queryEngine.queryVoid(
    `
    PREFIX ex: <http://example.org/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    INSERT DATA {
      ex:alice foaf:name "Alice" .
      ex:bob foaf:name "Bob" .
    }
  `,
    context,
  );
  await flushAsync();

  // Verify both are searchable
  assertEquals((await searchEngine.searchFacts("Alice", 10)).length, 1);
  assertEquals((await searchEngine.searchFacts("Bob", 10)).length, 1);

  // Delete Alice via SPARQL DELETE
  await queryEngine.queryVoid(
    `
    PREFIX ex: <http://example.org/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    DELETE WHERE {
      ex:alice foaf:name ?name .
    }
  `,
    context,
  );
  await flushAsync();

  // Verify Alice is removed from Orama, Bob remains
  assertEquals((await searchEngine.searchFacts("Alice", 10)).length, 0);
  assertEquals((await searchEngine.searchFacts("Bob", 10)).length, 1);

  // Verify store state via SELECT
  const selectResult = await queryEngine.queryBindings(
    `
    PREFIX ex: <http://example.org/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?name WHERE {
      ?person foaf:name ?name .
    }
  `,
    context,
  );

  const names: string[] = [];
  for await (const binding of selectResult) {
    const name = binding.get("name");
    if (name) {
      names.push(name.value);
    }
  }
  assertEquals(names.length, 1);
  assertEquals(names[0], "Bob");
});

function setup() {
  const store = new Store();
  const orama = createFactOrama();
  const searchEngine = new OramaSearchEngine(orama);
  const syncedStore = syncOrama(orama, store);
  return { store, orama, searchEngine, syncedStore };
}

function createQuad(
  subject: string,
  predicate: string,
  object: string,
  graph = "http://example.org/graph/default",
): RDF.Quad {
  return DataFactory.quad(
    DataFactory.namedNode(subject),
    DataFactory.namedNode(predicate),
    DataFactory.literal(object),
    DataFactory.namedNode(graph),
  );
}

function createQuadStream(quads: RDF.Quad[]): RDF.Stream<RDF.Quad> {
  return streamFromQuads(quads);
}

function streamFromQuads(quads: RDF.Quad[]): RDF.Stream<RDF.Quad> {
  const emitter = new EventEmitter() as RDF.Stream<RDF.Quad>;
  emitter.read = () => null;
  queueMicrotask(() => {
    for (const quad of quads) {
      emitter.emit("data", quad);
    }
    emitter.emit("end");
  });
  return emitter;
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
