import { assert, assertEquals } from "@std/assert";
import { sparql } from "./sparql.ts";
import { DataFactory, Store } from "n3";

const { namedNode, literal, quad } = DataFactory;

Deno.test("SPARQL Layer", async (t) => {
  await t.step("SELECT on empty world returns empty results", async () => {
    const store = new Store();
    const query = "SELECT * WHERE { ?s ?p ?o }";
    const { result } = await sparql(store, query);

    // deno-lint-ignore no-explicit-any
    assertEquals((result as any).results.bindings.length, 0);
  });

  await t.step("INSERT DATA updates the store", async () => {
    const store = new Store();
    const insertQuery = `
      INSERT DATA {
        <http://example.org/s> <http://example.org/p> "object" .
      }
    `;
    const { result } = await sparql(store, insertQuery);
    assert(result === null);

    const selectQuery =
      "SELECT ?o WHERE { <http://example.org/s> <http://example.org/p> ?o }";
    const { result: selectResult } = await sparql(store, selectQuery);

    // deno-lint-ignore no-explicit-any
    assertEquals((selectResult as any).results.bindings.length, 1);
    // deno-lint-ignore no-explicit-any
    assertEquals((selectResult as any).results.bindings[0].o.value, "object");
  });

  await t.step("SELECT queries existing data", async () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode("http://a"),
      namedNode("http://b"),
      literal("c"),
    ));

    const query = "SELECT ?s WHERE { ?s <http://b> 'c' }";
    const { result } = await sparql(store, query);

    // deno-lint-ignore no-explicit-any
    assertEquals((result as any).results.bindings.length, 1);
    // deno-lint-ignore no-explicit-any
    assertEquals((result as any).results.bindings[0].s.value, "http://a");
  });
});
