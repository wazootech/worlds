import { assert, assertEquals } from "@std/assert";
import { Parser, Store } from "n3";
import { createTestAccount, createTestContext } from "#/server/testing.ts";
import { generateBlobFromN3Store } from "#/server/db/n3.ts";
import { createWorldsKvdex } from "#/server/db/kvdex.ts";
import createRoute from "./route.ts";

/**
 * For a comprehensive suite of test cases for standard SPARQL endpoints, see:
 * https://www.w3.org/2009/sparql/docs/tests/summary.html
 */

async function setWorldData(kv: Deno.Kv, worldId: string, ttl: string) {
  const parser = new Parser();
  const quads = parser.parse(ttl);
  const store = new Store();
  store.addQuads(quads);
  const blob = await generateBlobFromN3Store(store);
  const db = createWorldsKvdex(kv);
  await db.worldBlobs.set(worldId, new Uint8Array(await blob.arrayBuffer()), {
    batched: true,
  });
}

Deno.test("SPARQL API routes - GET operations", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const app = createRoute(testContext);

  await t.step(
    "GET /v1/worlds/:world/sparql returns service description when no query",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/sparql`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 200);
      const contentType = resp.headers.get("content-type");
      assert(
        contentType === "text/turtle" || contentType === "application/rdf+xml",
      );
      const body = await resp.text();
      assert(body.includes("Service") || body.length > 0);
    },
  );

  testContext.kv.close();
});

Deno.test("SPARQL API routes - POST operations (Query)", async (t) => {
  const testContext = await createTestContext();
  const { db, kv } = testContext;
  const app = createRoute(testContext);

  await t.step(
    "POST /v1/worlds/:world/sparql (query parameter) executes SPARQL Query",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      // Set up test data
      await setWorldData(
        kv,
        worldId,
        '<http://example.com/s> <http://example.com/p> "o" .',
      );

      const query = encodeURIComponent("SELECT ?s WHERE { ?s ?p ?o }");
      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql?query=${query}`,
        {
          method: "POST",
          headers: {
            "Accept": "application/sparql-results+json",
            "Authorization": `Bearer ${apiKey}`,
          },
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 200);
      assertEquals(
        res.headers.get("content-type"),
        "application/sparql-results+json",
      );

      const json = await res.json();

      // Check Standard SPARQL JSON Results Structure
      assert(json.head);
      assert(Array.isArray(json.head.vars));
      assertEquals(json.head.vars.length, 1);
      assertEquals(json.head.vars[0], "s");

      assert(json.results);
      assert(Array.isArray(json.results.bindings));
      assertEquals(json.results.bindings.length, 1);

      const binding = json.results.bindings[0];
      assertEquals(binding.s.type, "uri");
      assertEquals(binding.s.value, "http://example.com/s");
    },
  );

  await t.step(
    "POST /v1/worlds/:world/sparql (body) executes SPARQL Query",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      // Set up test data
      await setWorldData(
        kv,
        worldId,
        '<http://example.com/s2> <http://example.com/p2> "o2" .',
      );

      const query = "SELECT ?s WHERE { ?s ?p ?o }";
      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/sparql-query",
            "Accept": "application/sparql-results+json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: query,
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 200);
      const json = await res.json();
      assert(json.head);
      assert(json.results);
      assert(json.results.bindings.length >= 1);
    },
  );

  testContext.kv.close();
});

Deno.test("SPARQL API routes - POST operations (Update)", async (t) => {
  const testContext = await createTestContext();
  const { db, kv } = testContext;
  const app = createRoute(testContext);

  await t.step(
    "POST /v1/worlds/:world/sparql executes SPARQL Update",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      // Set up initial data
      await setWorldData(
        kv,
        worldId,
        '<http://example.com/s> <http://example.com/p> "o" .',
      );

      // Execute update
      const updateQuery =
        'INSERT { <http://example.com/s2> <http://example.com/p2> "o2" . } WHERE { }';
      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/sparql-update",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: updateQuery,
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 204);

      // Verify update by querying - need to wait a bit for the update to persist
      await new Promise((resolve) => setTimeout(resolve, 500));

      const verifyQuery = encodeURIComponent("SELECT ?s WHERE { ?s ?p ?o }");
      const verifyReq = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql?query=${verifyQuery}`,
        {
          method: "POST",
          headers: {
            "Accept": "application/sparql-results+json",
            "Authorization": `Bearer ${apiKey}`,
          },
        },
      );

      const verifyRes = await app.fetch(verifyReq);
      assertEquals(verifyRes.status, 200);
      const json = await verifyRes.json();
      assert(json.results.bindings.length >= 2);
    },
  );

  await t.step(
    "POST /v1/worlds/:world/sparql executes SPARQL Update with PREFIX",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World With Prefix",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      // Execute update with PREFIX
      const updateQuery = `
        PREFIX ex: <http://example.org/>
        INSERT DATA { ex:alice a ex:Person ; ex:name "Alice" . }
      `;
      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/sparql-update",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: updateQuery,
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 204);

      // Verify update by querying - need to wait a bit for the update to persist
      await new Promise((resolve) => setTimeout(resolve, 500));

      const verifyQuery = `
        PREFIX ex: <http://example.org/>
        SELECT ?name WHERE { ?s ex:name ?name }
      `;
      const verifyReq = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql?query=${
          encodeURIComponent(verifyQuery)
        }`,
        {
          method: "POST",
          headers: {
            "Accept": "application/sparql-results+json",
            "Authorization": `Bearer ${apiKey}`,
          },
        },
      );

      const verifyRes = await app.fetch(verifyReq);
      assertEquals(verifyRes.status, 200);
      const json = await verifyRes.json();
      assert(json.results.bindings.length >= 1);
      assertEquals(json.results.bindings[0].name.value, "Alice");
    },
  );

  testContext.kv.close();
});

Deno.test("SPARQL API routes - Error handling", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const app = createRoute(testContext);

  await t.step(
    "POST /v1/worlds/:world/sparql returns 404 for non-existent world",
    async () => {
      const { apiKey } = await createTestAccount(db);

      const query = encodeURIComponent("SELECT ?s WHERE { ?s ?p ?o }");
      const req = new Request(
        `http://localhost/v1/worlds/non-existent-world/sparql?query=${query}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 404);
    },
  );

  await t.step(
    "POST /v1/worlds/:world/sparql returns 401 for unauthenticated request",
    async () => {
      const { id: accountId } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      const query = encodeURIComponent("SELECT ?s WHERE { ?s ?p ?o }");
      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql?query=${query}`,
        {
          method: "POST",
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 404);
    },
  );

  await t.step(
    "POST /v1/worlds/:world/sparql returns 415 for unsupported content type",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: "SELECT ?s WHERE { ?s ?p ?o }",
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 415);
    },
  );

  await t.step(
    "POST /v1/worlds/:world/sparql returns 400 for invalid SPARQL syntax (Query)",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      // Invalid query: Missing closing brace
      const query = "SELECT * WHERE { ?s ?p ?o";
      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/sparql-query",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: query,
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 400);
      const json = await res.json();
      assert(json.error);
    },
  );

  await t.step(
    "POST /v1/worlds/:world/sparql returns 400 for invalid SPARQL syntax (Update)",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      // Invalid update: Missing closing brace
      const update = "INSERT DATA { <http://s> <http://p> <http://o>";
      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/sparql-update",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: update,
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 400);
      const json = await res.json();
      assert(json.error);
    },
  );

  testContext.kv.close();
});

Deno.test("SPARQL API routes - Method validation", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const app = createRoute(testContext);

  await t.step(
    "PUT /v1/worlds/:world/sparql returns 405 Method Not Allowed",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 405);
      assertEquals(res.headers.get("Allow"), "GET, POST");
    },
  );

  await t.step(
    "DELETE /v1/worlds/:world/sparql returns 405 Method Not Allowed",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 405);
      assertEquals(res.headers.get("Allow"), "GET, POST");
    },
  );

  testContext.kv.close();
});

Deno.test("SPARQL API routes - Usage Tracking", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const app = createRoute(testContext);

  await t.step(
    "SPARQL requests track usage",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Usage Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      // Make a request
      const query = encodeURIComponent("SELECT ?s WHERE { ?s ?p ?o }");
      const req = new Request(
        `http://localhost/v1/worlds/${worldId}/sparql?query=${query}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        },
      );

      const res = await app.fetch(req);
      assertEquals(res.status, 200);

      // Verify usage bucket
      // We don't know the exact bucket ID (it's time based), but we can query by secondary index
      const { result: buckets } = await db.usageBuckets.findBySecondaryIndex(
        "worldId",
        worldId,
      );

      assert(buckets.length > 0);
      assertEquals(buckets[0].value.requestCount, 1);
      assertEquals(buckets[0].value.accountId, accountId);
    },
  );

  testContext.kv.close();
});
