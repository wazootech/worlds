import { assertEquals } from "@std/assert";
import { executeSparql } from "./sparql-engine.ts";
import { DataFactory, Store } from "n3";

const { namedNode, literal, quad, defaultGraph } = DataFactory;

Deno.test("executeSparql", async (t) => {
  await t.step("SELECT returns bindings", async () => {
    const store = new Store();
    store.addQuad(
      quad(namedNode("http://s"), namedNode("http://p"), literal("o")),
    );

    const result = await executeSparql(
      store,
      "SELECT ?s ?p ?o WHERE { ?s ?p ?o }",
    );

    // @ts-ignore - dynamic result
    assertEquals(result.results.bindings.length, 1);
    // @ts-ignore - dynamic result
    assertEquals(result.results.bindings[0].s.value, "http://s");
    // @ts-ignore - dynamic result
    assertEquals(result.results.bindings[0].p.value, "http://p");
    // @ts-ignore - dynamic result
    assertEquals(result.results.bindings[0].o.value, "o");
  });

  await t.step("SELECT with filter returns correct bindings", async () => {
    const store = new Store();
    store.addQuad(
      quad(namedNode("http://a"), namedNode("http://type"), literal("person")),
    );
    store.addQuad(
      quad(namedNode("http://b"), namedNode("http://type"), literal("place")),
    );

    const result = await executeSparql(
      store,
      "SELECT ?s WHERE { ?s <http://type> 'person' }",
    );

    // @ts-ignore - dynamic result
    assertEquals(result.results.bindings.length, 1);
    // @ts-ignore - dynamic result
    assertEquals(result.results.bindings[0].s.value, "http://a");
  });

  await t.step("ASK returns boolean true", async () => {
    const store = new Store();
    store.addQuad(
      quad(namedNode("http://s"), namedNode("http://p"), literal("o")),
    );

    const result = await executeSparql(
      store,
      "ASK { <http://s> <http://p> 'o' }",
    );

    // @ts-ignore - dynamic result
    assertEquals(result.boolean, true);
  });

  await t.step("ASK returns boolean false", async () => {
    const store = new Store();
    store.addQuad(
      quad(namedNode("http://s"), namedNode("http://p"), literal("o")),
    );

    const result = await executeSparql(
      store,
      "ASK { <http://s> <http://p> 'different' }",
    );

    // @ts-ignore - dynamic result
    assertEquals(result.boolean, false);
  });

  await t.step("CONSTRUCT returns quads", async () => {
    const store = new Store();
    store.addQuad(
      quad(namedNode("http://s"), namedNode("http://p"), literal("o")),
    );

    const result = await executeSparql(
      store,
      "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",
    );

    // @ts-ignore - dynamic result
    assertEquals(result.results.quads.length, 1);
    // @ts-ignore - dynamic result
    assertEquals(result.results.quads[0].subject.value, "http://s");
    // @ts-ignore - dynamic result
    assertEquals(result.results.quads[0].predicate.value, "http://p");
    // @ts-ignore - dynamic result
    assertEquals(result.results.quads[0].object.value, "o");
  });

  await t.step("INSERT DATA updates and returns null", async () => {
    const store = new Store();

    const result = await executeSparql(
      store,
      "INSERT DATA { <http://s> <http://p> 'o' }",
    );

    assertEquals(result, null);

    // Verify the data was inserted
    const selectResult = await executeSparql(
      store,
      "SELECT ?o WHERE { <http://s> <http://p> ?o }",
    );
    // @ts-ignore - dynamic result
    assertEquals(selectResult.results.bindings.length, 1);
  });

  await t.step("DELETE DATA removes triples", async () => {
    const store = new Store();
    store.addQuad(
      quad(namedNode("http://s"), namedNode("http://p"), literal("o")),
    );

    const result = await executeSparql(
      store,
      "DELETE DATA { <http://s> <http://p> 'o' }",
    );

    assertEquals(result, null);

    // Verify data was deleted
    const selectResult = await executeSparql(
      store,
      "SELECT ?o WHERE { <http://s> <http://p> ?o }",
    );
    // @ts-ignore - dynamic result
    assertEquals(selectResult.results.bindings.length, 0);
  });

  await t.step("SELECT with empty store returns empty results", async () => {
    const store = new Store();

    const result = await executeSparql(
      store,
      "SELECT ?s ?p ?o WHERE { ?s ?p ?o }",
    );

    // @ts-ignore - dynamic result
    assertEquals(result.results.bindings.length, 0);
  });

  await t.step("SELECT with multiple variables", async () => {
    const store = new Store();
    store.addQuad(
      quad(
        namedNode("http://subject"),
        namedNode("http://predicate"),
        literal("object"),
        defaultGraph(),
      ),
    );

    const result = await executeSparql(
      store,
      "SELECT * WHERE { ?s ?p ?o }",
    );

    // @ts-ignore - dynamic result
    assertEquals(result.head.vars.length, 3);
    // @ts-ignore - dynamic result
    assertEquals(result.results.bindings.length, 1);
  });
});
