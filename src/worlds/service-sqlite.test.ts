import { assert, assertEquals } from "@std/assert";
import { type AppContext, sqliteAppContext } from "#/server/app-context.ts";
import { defaultGraph, namedNode, type Quad, Store } from "oxigraph";
import type { Account } from "#/accounts/service.ts";

async function setup(context: AppContext, accountId: string) {
  await context.accountsService.set({
    id: accountId,
    apiKey: "sk_" + accountId,
    description: "Test Account",
    plan: "free",
    accessControl: { worlds: [] },
  } as Account);
}

Deno.test("SqliteOxigraphService: setStore and getStore", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.oxigraphService;
  const worldId = "test-world-1";
  const owner = "test-owner";
  await setup(context, owner);

  const store = new Store();
  store.add({
    subject: namedNode("http://example.com/s"),
    predicate: namedNode("http://example.com/p"),
    object: namedNode("http://example.com/o"),
    graph: defaultGraph(),
  } as Quad);

  await service.setStore(worldId, owner, store);

  const retrievedStore = await service.getStore(worldId);
  assert(retrievedStore);
  assertEquals(retrievedStore.size, 1);
  const quads = retrievedStore.match();
  assertEquals(quads[0].subject.value, "http://example.com/s");
});

Deno.test("SqliteOxigraphService: getMetadata returns correct metadata", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.oxigraphService;
  const worldId = "test-world-metadata";
  const owner = "test-owner";
  await setup(context, owner);
  const store = new Store();

  await service.setStore(worldId, owner, store);

  const metadata = await service.getMetadata(worldId);
  assert(metadata);
  assertEquals(metadata.id, worldId);
  assertEquals(metadata.createdBy, owner);
  assert(metadata.createdAt > 0);
  assert(metadata.updatedAt > 0);
});

Deno.test("SqliteOxigraphService: addQuads appends data", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.oxigraphService;
  const worldId = "test-world-quads";
  const owner = "test-owner";
  await setup(context, owner);

  // Initialize with one quad
  const initialStore = new Store();
  initialStore.add({
    subject: namedNode("http://s1"),
    predicate: namedNode("http://p1"),
    object: namedNode("http://o1"),
    graph: defaultGraph(),
  } as Quad);
  await service.setStore(worldId, owner, initialStore);

  // Add another quad
  await service.addQuads(worldId, owner, [{
    subject: namedNode("http://s2"),
    predicate: namedNode("http://p2"),
    object: namedNode("http://o2"),
    graph: namedNode("http://g1"),
    termType: "Quad",
    value: "",
    equals: () => false,
  } as unknown as Quad]);

  const retrievedStore = await service.getStore(worldId);
  assert(retrievedStore);
  assertEquals(retrievedStore.size, 2);
});

Deno.test("SqliteOxigraphService: query executes SPARQL", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.oxigraphService;
  const worldId = "test-world-query";
  const owner = "test-owner";
  await setup(context, owner);

  const store = new Store();
  store.add({
    subject: namedNode("http://s"),
    predicate: namedNode("http://p"),
    object: namedNode("http://o"),
    graph: defaultGraph(),
  } as Quad);
  await service.setStore(worldId, owner, store);

  // Simple ASK query
  const askResult = await service.query(worldId, "ASK { <http://s> ?p ?o }");
  assertEquals(askResult, true);

  // SELECT query (simple check, result format depends on oxigraph)
  // We just want to ensure it runs without error and returns something truthy/expected
  const selectResult = await service.query(
    worldId,
    "SELECT ?s WHERE { ?s ?p ?o }",
  );
  assert(Array.isArray(selectResult));
  assertEquals(selectResult.length, 1);
});

Deno.test("SqliteOxigraphService: searchStatements finds matches", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.oxigraphService;
  const worldId = "test-world-search";
  const owner = "test-owner";
  await setup(context, owner);

  const store = new Store();
  store.add({
    subject: namedNode("http://apple"),
    predicate: namedNode("http://type"),
    object: namedNode("http://fruit"),
    graph: defaultGraph(),
  } as Quad);
  await service.setStore(worldId, owner, store);

  const results = await service.searchStatements(worldId, "apple");
  assertEquals(results.length, 1);
  assertEquals(results[0].item.subject, "http://apple");
});

Deno.test("SqliteOxigraphService: updateDescription updates metadata", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.oxigraphService;
  const worldId = "test-world-desc";
  const owner = "test-owner";
  await setup(context, owner);

  await service.setStore(worldId, owner, new Store());

  await service.updateDescription(worldId, "New Description");
  const metadata = await service.getMetadata(worldId);
  assertEquals(metadata?.description, "New Description");
});

Deno.test("SqliteOxigraphService: removeStore deletes world", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.oxigraphService;
  const worldId = "test-world-remove";
  const owner = "test-owner";
  await setup(context, owner);

  await service.setStore(worldId, owner, new Store());
  assert(await service.getMetadata(worldId));

  await service.removeStore(worldId);
  const metadata = await service.getMetadata(worldId);
  assertEquals(metadata, null);
});
