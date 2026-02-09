import { assert, assertEquals } from "@std/assert";
import { sparql } from "./sparql.ts";
import { generateBlobFromN3Store } from "./n3.ts";
import { DataFactory, Store } from "n3";

const { namedNode, literal, quad } = DataFactory;

Deno.test("SPARQL Layer", async (t) => {
  await t.step("SELECT on empty world returns empty results", async () => {
    const blob = new Blob([], { type: "application/n-quads" });
    const query = "SELECT * WHERE { ?s ?p ?o }";
    const { result } = await sparql(blob, query);

    // deno-lint-ignore no-explicit-any
    assertEquals((result as any).results.bindings.length, 0);
  });

  await t.step("INSERT DATA updates the world", async () => {
    const initialBlob = new Blob([], { type: "application/n-quads" });
    const insertQuery = `
      INSERT DATA {
        <http://example.org/s> <http://example.org/p> "object" .
      }
    `;
    const { blob: updatedBlob, result } = await sparql(
      initialBlob,
      insertQuery,
    );
    // INSERT queries often return void (null in our result)
    assert(result === null);

    // Verify persistence by querying the updated blob
    const selectQuery =
      "SELECT ?o WHERE { <http://example.org/s> <http://example.org/p> ?o }";
    const { result: selectResult } = await sparql(updatedBlob, selectQuery);

    // deno-lint-ignore no-explicit-any
    assertEquals((selectResult as any).results.bindings.length, 1);
    // deno-lint-ignore no-explicit-any
    assertEquals((selectResult as any).results.bindings[0].o.value, "object");
  });

  await t.step("SELECT queries existing data", async () => {
    // Pre-populate directly via N3 layer
    const store = new Store();
    store.addQuad(quad(
      namedNode("http://a"),
      namedNode("http://b"),
      literal("c"),
    ));
    const blob = await generateBlobFromN3Store(store);

    const query = "SELECT ?s WHERE { ?s <http://b> 'c' }";
    const { result } = await sparql(blob, query);

    // deno-lint-ignore no-explicit-any
    assertEquals((result as any).results.bindings.length, 1);
    // deno-lint-ignore no-explicit-any
    assertEquals((result as any).results.bindings[0].s.value, "http://a");
  });
});
