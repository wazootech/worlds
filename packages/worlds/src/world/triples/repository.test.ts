import { assertEquals, assertExists } from "@std/assert";
import { createClient } from "@libsql/client";
import { TriplesRepository } from "./repository.ts";

Deno.test("TriplesRepository", async (t) => {
  const client = createClient({ url: "file::memory:" });
  const repo = new TriplesRepository(client);

  await t.step("upsert and getAll", async () => {
    await repo.upsert({
      id: "triple-1",
      subject: "http://example.org/s",
      predicate: "http://example.org/p",
      object: "http://example.org/o",
      graph: "<default>",
    });

    const all = await repo.getAll();
    assertEquals(all.length, 1);
    assertEquals(all[0].subject, "http://example.org/s");
  });

  await t.step("getByGraph", async () => {
    await repo.upsert({
      id: "triple-2",
      subject: "http://example.org/a",
      predicate: "http://example.org/b",
      object: "http://example.org/c",
      graph: "http://example.org/graph1",
    });

    const inGraph = await repo.getByGraph("http://example.org/graph1");
    assertEquals(inGraph.length, 1);
    assertEquals(inGraph[0].subject, "http://example.org/a");

    const defaultGraph = await repo.getByGraph("<default>");
    assertEquals(defaultGraph.length, 1);
  });

  await t.step("delete", async () => {
    await repo.delete("triple-1");

    const all = await repo.getAll();
    assertEquals(all.length, 1); // triple-2 still exists
  });

  await t.step("query SELECT returns bindings", async () => {
    await repo.upsert({
      id: "triple-3",
      subject: "http://s",
      predicate: "http://p",
      object: "o",
      graph: "<default>",
    });

    const result = await repo.query(
      "SELECT ?s ?p ?o WHERE { ?s ?p ?o }",
    ) as { results: { bindings: Record<string, { value: string }>[] } };

    assertEquals(result.results.bindings.length, 1);
    assertEquals(result.results.bindings[0].s.value, "http://s");
    assertEquals(result.results.bindings[0].p.value, "http://p");
    assertEquals(result.results.bindings[0].o.value, "o");
  });

  await t.step("query SELECT with filter", async () => {
    await repo.upsert({
      id: "triple-4",
      subject: "http://person",
      predicate: "http://type",
      object: "Person",
      graph: "<default>",
    });

    const result = await repo.query(
      "SELECT ?s WHERE { ?s <http://type> 'Person' }",
    ) as { results: { bindings: Record<string, { value: string }>[] } };

    assertEquals(result.results.bindings.length, 1);
    assertEquals(result.results.bindings[0].s.value, "http://person");
  });

  await t.step("query ASK returns boolean", async () => {
    const result = await repo.query(
      "ASK { <http://s> <http://p> 'o' }",
    ) as { boolean: boolean };

    assertEquals(result.boolean, true);
  });

  await t.step("query CONSTRUCT returns quads", async () => {
    const result = await repo.query(
      "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",
    ) as {
      results: {
        quads: {
          subject: { value: string };
          predicate: { value: string };
          object: { value: string };
        }[];
      };
    };

    assertEquals(result.results.quads.length, 3); // 3 triples in store
  });

  await t.step("query INSERT DATA returns null", async () => {
    const result = await repo.query(
      "INSERT DATA { <http://new> <http://new> 'new' }",
    );

    assertEquals(result, null);

    // Verify it was inserted
    const selectResult = await repo.query(
      "SELECT ?o WHERE { <http://new> <http://new> ?o }",
    ) as { results: { bindings: Record<string, { value: string }>[] } };

    assertEquals(selectResult.results.bindings.length, 1);
    assertEquals(selectResult.results.bindings[0].o.value, "new");
  });

  await t.step("import parses N-Quads", async () => {
    await repo.import(
      `<http://s1> <http://p1> <http://o1> .
<http://s2> <http://p2> "literal" .`,
      "application/n-quads",
    );

    const result = await repo.query(
      "SELECT * WHERE { ?s ?p ?o }",
    ) as { results: { bindings: Record<string, { value: string }>[] } };

    assertEquals(result.results.bindings.length, 5); // 3 previous + 2 new
  });

  await t.step("export serializes to N-Quads", async () => {
    const buffer = await repo.export("application/n-quads");
    const text = new TextDecoder().decode(buffer);

    assertExists(text.includes("http://s"));
    assertExists(text.includes("http://p"));
  });
});
