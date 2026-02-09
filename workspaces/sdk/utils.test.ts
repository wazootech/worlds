import { assert } from "@std/assert";
import { isSparqlUpdate } from "./utils.ts";

Deno.test("isUpdateQuery - Update operations", async (t) => {
  const updates = [
    `INSERT DATA { <http://s> <http://p> <http://o> }`,
    `DELETE DATA { <http://s> <http://p> <http://o> }`,
    `DELETE WHERE { ?s ?p ?o }`,
    `LOAD <http://example.org/data>`,
    `CLEAR DEFAULT`,
    `CREATE GRAPH <http://example.org/g>`,
    `DROP GRAPH <http://example.org/g>`,
    `COPY DEFAULT TO NAMED <http://example.org/g>`,
    `MOVE DEFAULT TO NAMED <http://example.org/g>`,
    `ADD DEFAULT TO NAMED <http://example.org/g>`,
  ];

  for (const query of updates) {
    await t.step(`identifies '${query.substring(0, 20)}...' as update`, () => {
      assert(isSparqlUpdate(query));
    });
  }
});

Deno.test("isUpdateQuery - Update with Prologue", async (t) => {
  const query = `
    PREFIX ex: <http://example.org/>
    INSERT DATA { ex:s ex:p ex:o }
  `;
  await t.step("identifies update with PREFIX", () => {
    assert(isSparqlUpdate(query));
  });

  const queryBase = `
    BASE <http://example.org/>
    INSERT DATA { <s> <p> <o> }
  `;
  await t.step("identifies update with BASE", () => {
    assert(isSparqlUpdate(queryBase));
  });
});

Deno.test("isUpdateQuery - Query operations (Read-only)", async (t) => {
  const queries = [
    `SELECT * WHERE { ?s ?p ?o }`,
    `CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`,
    `ASK { ?s ?p ?o }`,
    `DESCRIBE <http://example.org/>`,
  ];

  for (const query of queries) {
    await t.step(
      `identifies '${query.substring(0, 20)}...' as NOT update`,
      () => {
        assert(!isSparqlUpdate(query));
      },
    );
  }
});

Deno.test("isUpdateQuery - Query with Prologue (Read-only)", async (t) => {
  const query = `
    PREFIX ex: <http://example.org/>
    SELECT ?s WHERE { ?s ?p ?o }
  `;
  await t.step("identifies SELECT with PREFIX as NOT update", () => {
    assert(!isSparqlUpdate(query));
  });
});
