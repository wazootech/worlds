import { assert, assertEquals } from "@std/assert";
import { Store } from "oxigraph";
import { kvAppContext } from "#/app-context.ts";
import createApp from "./route.ts";
import type { Account } from "#/accounts/accounts-service.ts";

const kv = await Deno.openKv(":memory:");
const ctx = kvAppContext(kv);
const app = await createApp(ctx);

// Create a test account with access to all test stores
const testAccount: Account = {
  id: "test-account",
  description: "Test account for SPARQL route tests",
  plan: "free_plan",
  accessControl: {
    stores: [
      "test-store-sparql-get",
      "test-store-sparql-post-form",
      "test-store-sparql-post-query",
      "test-store-sparql-update-direct",
    ],
  },
};
await ctx.accountsService.set(testAccount);

const testApiKey = "test-account";

Deno.test("GET /v1/stores/{store}/sparql executes SPARQL Query", async () => {
  const storeId = "test-store-sparql-get";

  // Setup data directly via service
  const store = new Store();
  store.load('<http://example.com/s> <http://example.com/p> "o" .', {
    format: "application/n-quads",
  });
  await ctx.oxigraphService.setStore(storeId, "test-account", store);

  const query = encodeURIComponent("SELECT ?s WHERE { ?s ?p ?o }");
  const req = new Request(
    `http://localhost/v1/stores/${storeId}/sparql?query=${query}`,
    {
      method: "GET",
      headers: {
        "Accept": "application/sparql-results+json",
        "Authorization": `Bearer ${testApiKey}`,
      },
    },
  );

  const res = await app.fetch(req);
  assertEquals(res.status, 200);
  const json = await res.json();

  // Check Simplified JSON Structure (Array of POJOs)
  assert(Array.isArray(json));
  assertEquals(json.length, 1);

  const binding = json[0];
  assertEquals(binding.s.termType, "NamedNode");
  assertEquals(binding.s.value, "http://example.com/s");
});

Deno.test("POST /v1/stores/{store}/sparql (form-urlencoded) executes SPARQL Query", async () => {
  const storeId = "test-store-sparql-post-form";

  // Setup data directly via service
  const store = new Store();
  store.load('<http://example.com/s> <http://example.com/p> "o" .', {
    format: "application/n-quads",
  });
  await ctx.oxigraphService.setStore(storeId, "test-account", store);

  const body = new URLSearchParams({ query: "SELECT ?s WHERE { ?s ?p ?o }" });
  const req = new Request(`http://localhost/v1/stores/${storeId}/sparql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/sparql-results+json",
      "Authorization": `Bearer ${testApiKey}`,
    },
    body: body.toString(),
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 200);
  const json = await res.json();

  // Check Simplified JSON Structure
  assert(Array.isArray(json));
  assertEquals(json.length, 1);
});

Deno.test("POST /v1/stores/{store}/sparql (sparql-query) executes SPARQL Query", async () => {
  const storeId = "test-store-sparql-post-query";

  // Setup data directly via service
  const store = new Store();
  store.load('<http://example.com/s> <http://example.com/p> "o" .', {
    format: "application/n-quads",
  });
  await ctx.oxigraphService.setStore(storeId, "test-account", store);

  const query = "SELECT ?s WHERE { ?s ?p ?o }";
  const req = new Request(`http://localhost/v1/stores/${storeId}/sparql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-query",
      "Accept": "application/sparql-results+json",
      "Authorization": `Bearer ${testApiKey}`,
    },
    body: query,
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 200);
  const json = await res.json();
  assert(Array.isArray(json));
  assertEquals(json.length, 1);
});

Deno.test("POST /v1/stores/{store}/sparql (direct) executes SPARQL Update", async () => {
  const storeId = "test-store-sparql-update-direct";

  // Initialize store (empty)
  const store = new Store();
  await ctx.oxigraphService.setStore(storeId, "test-account", store);

  const update =
    'INSERT DATA { <http://example.com/s> <http://example.com/p> "o" }';
  const req = new Request(`http://localhost/v1/stores/${storeId}/sparql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-update",
      "Authorization": `Bearer ${testApiKey}`,
    },
    body: update,
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 204);

  // Verify using query
  const query = encodeURIComponent("SELECT * WHERE { ?s ?p ?o }");
  const resQuery = await app.fetch(
    new Request(
      `http://localhost/v1/stores/${storeId}/sparql?query=${query}`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${testApiKey}` },
      },
    ),
  );
  const json = await resQuery.json();
  assert(Array.isArray(json));
  assertEquals(json.length, 1);
});
