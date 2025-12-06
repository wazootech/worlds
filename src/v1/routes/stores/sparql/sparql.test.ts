import { assert, assertEquals } from "@std/assert";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Store } from "oxigraph";
import { DenoKvOxigraphService } from "#/oxigraph/deno-kv-oxigraph-service.ts";
import { withOxigraphService } from "../route.ts";
import { app } from "./route.ts";

Deno.test("GET /v1/stores/{store}/sparql executes SPARQL Query", async () => {
  const kv = await Deno.openKv(":memory:");
  const service = new DenoKvOxigraphService(kv);
  const storeId = "test-store-sparql-get";

  // Setup data
  const store = new Store();
  store.load('<http://example.com/s> <http://example.com/p> "o" .', {
    format: "application/n-quads",
  });
  await service.setStore(storeId, store);

  // Setup app
  const testApp = new OpenAPIHono();
  testApp.use("*", withOxigraphService(service));
  testApp.route("/", app);

  const query = encodeURIComponent("SELECT ?s WHERE { ?s ?p ?o }");
  const req = new Request(
    `http://localhost/v1/stores/${storeId}/sparql?query=${query}`,
    {
      method: "GET",
      headers: { "Accept": "application/sparql-results+json" },
    },
  );

  const res = await testApp.request(req);
  assertEquals(res.status, 200);
  const json = await res.json();

  // Check Standard SPARQL JSON Structure
  assert(json.head);
  assert(json.results);
  assert(Array.isArray(json.results.bindings));
  assertEquals(json.results.bindings.length, 1);

  const binding = json.results.bindings[0];
  assertEquals(binding.s.type, "uri");
  assertEquals(binding.s.value, "http://example.com/s");

  kv.close();
});

Deno.test("POST /v1/stores/{store}/sparql (form-urlencoded) executes SPARQL Query", async () => {
  const kv = await Deno.openKv(":memory:");
  const service = new DenoKvOxigraphService(kv);
  const storeId = "test-store-sparql-post-form";

  // Setup data
  const store = new Store();
  store.load('<http://example.com/s> <http://example.com/p> "o" .', {
    format: "application/n-quads",
  });
  await service.setStore(storeId, store);

  // Setup app
  const testApp = new OpenAPIHono();
  testApp.use("*", withOxigraphService(service));
  testApp.route("/", app);

  const body = new URLSearchParams({ query: "SELECT ?s WHERE { ?s ?p ?o }" });
  const req = new Request(`http://localhost/v1/stores/${storeId}/sparql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/sparql-results+json",
    },
    body: body.toString(),
  });

  const res = await testApp.request(req);
  assertEquals(res.status, 200);
  const json = await res.json();

  // Check Standard SPARQL JSON Structure
  assert(json.head);
  assert(json.results);
  assert(Array.isArray(json.results.bindings));
  assertEquals(json.results.bindings.length, 1);

  kv.close();
});

Deno.test("POST /v1/stores/{store}/sparql (direct) executes SPARQL Update", async () => {
  const kv = await Deno.openKv(":memory:");
  const service = new DenoKvOxigraphService(kv);
  const storeId = "test-store-sparql-update-direct";

  // Setup data
  const store = new Store();
  await service.setStore(storeId, store);

  // Setup app
  const testApp = new OpenAPIHono();
  testApp.use("*", withOxigraphService(service));
  testApp.route("/", app);

  const update =
    'INSERT DATA { <http://example.com/s> <http://example.com/p> "o" }';
  const req = new Request(`http://localhost/v1/stores/${storeId}/sparql`, {
    method: "POST",
    headers: { "Content-Type": "application/sparql-update" },
    body: update,
  });

  const res = await testApp.request(req);
  assertEquals(res.status, 204);

  // Verify
  const result = await service.getStore(storeId);
  assertEquals(result?.size, 1);

  kv.close();
});
