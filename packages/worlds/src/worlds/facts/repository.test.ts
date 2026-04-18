import { assertEquals, assertExists } from "@std/assert";
import { Store } from "n3";
import { FactsRepository } from "./repository.ts";
import type { WorldsStorage } from "#/storage.ts";

function createTestStorage(): WorldsStorage {
  return { store: new Store() };
}

Deno.test("FactsRepository - upsert", async (t) => {
  const storage = createTestStorage();
  const repo = new FactsRepository(storage);

  await t.step("upsert adds quad to store", async () => {
    await repo.upsert({
      id: "fact-1",
      subject: "http://example.org/s",
      predicate: "http://example.org/p",
      object: "Test Object",
      graph: "http://example.org/g",
    });

    const all = await repo.getAll();
    assertEquals(all.length, 1);
    assertEquals(all[0].subject, "http://example.org/s");
  });

  await t.step(
    "upsert replaces existing quad with same S/P/O/G key",
    async () => {
      const storage2 = createTestStorage();
      const repo2 = new FactsRepository(storage2);

      await repo2.upsert({
        id: "fact-2",
        subject: "http://example.org/s",
        predicate: "http://example.org/p",
        object: "Test",
        graph: "http://example.org/g",
      });

      await repo2.upsert({
        id: "fact-2",
        subject: "http://example.org/s",
        predicate: "http://example.org/p",
        object: "Test",
        graph: "http://example.org/g",
      });

      const all = await repo2.getAll();
      assertEquals(all.length, 1);
      const fact = all.find((f) => f.subject === "http://example.org/s");
      assertExists(fact);
      assertEquals(fact!.object, "Test");
    },
  );

  await t.step("delete removes quad by ID", async () => {
    const storage3 = createTestStorage();
    const repo3 = new FactsRepository(storage3);

    await repo3.upsert({
      id: "fact-3",
      subject: "http://example.org/to-delete",
      predicate: "http://example.org/p",
      object: "Delete Me",
      graph: "http://example.org/g",
    });

    let all = await repo3.getAll();
    assertEquals(
      all.some((f) => f.subject === "http://example.org/to-delete"),
      true,
    );

    await repo3.delete("fact-3");

    all = await repo3.getAll();
    assertEquals(
      all.some((f) => f.subject === "http://example.org/to-delete"),
      false,
    );
  });
});

Deno.test("FactsRepository - getAll", async () => {
  const storage = createTestStorage();
  const repo = new FactsRepository(storage);

  await repo.upsert({
    id: "fact-a",
    subject: "http://example.org/s1",
    predicate: "http://example.org/p1",
    object: "Object 1",
    graph: "http://example.org/g1",
  });
  await repo.upsert({
    id: "fact-b",
    subject: "http://example.org/s2",
    predicate: "http://example.org/p2",
    object: "Object 2",
    graph: "http://example.org/g2",
  });

  const all = await repo.getAll();
  assertEquals(all.length, 2);

  const ids = all.map((f) => f.id);
  assertEquals(ids.includes("fact-a"), true);
  assertEquals(ids.includes("fact-b"), true);
});

Deno.test("FactsRepository - getByGraph", async () => {
  const storage = createTestStorage();
  const repo = new FactsRepository(storage);

  await repo.upsert({
    id: "fact-g1",
    subject: "http://example.org/s",
    predicate: "http://example.org/p",
    object: "Object",
    graph: "http://example.org/g1",
  });

  const byGraph = await repo.getByGraph("http://example.org/g1");
  assertEquals(byGraph.length, 1);
  assertEquals(byGraph[0].graph, "http://example.org/g1");
});

Deno.test("FactsRepository - import/export", async () => {
  const storage = createTestStorage();
  const repo = new FactsRepository(storage);

  await repo.import(
    `
    <http://example.org/a> <http://example.org/b> "imported" .
  `,
    "text/turtle",
  );

  const all = await repo.getAll();
  const imported = all.find((f) => f.subject === "http://example.org/a");
  assertExists(imported);
  assertEquals(imported!.object, "imported");

  const exported = await repo.export("application/n-triples");
  const text = new TextDecoder().decode(exported);
  assertEquals(text.includes("http://example.org/a"), true);
});

Deno.test("FactsRepository - SPARQL query", async () => {
  const storage = createTestStorage();
  const repo = new FactsRepository(storage);

  await repo.upsert({
    id: "fact-q",
    subject: "http://example.org/s",
    predicate: "http://example.org/p",
    object: "Test Value",
    graph: "https://wazoo.dev/worlds/graphs/default",
  });

  const result = await repo.query(
    `SELECT ?s ?o WHERE { ?s <http://example.org/p> ?o }`,
  );

  assertEquals(typeof result, "object");
});
