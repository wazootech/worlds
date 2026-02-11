import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import { Parser, Store } from "n3";
import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import type { AppContext } from "#/context.ts";
import { generateBlobFromN3Store } from "#/lib/blob/n3.ts";
import { BlobsService } from "#/lib/database/tables/blobs/service.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import { ServiceAccountsService } from "#/lib/database/tables/service-accounts/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";
import createRoute from "./route.ts";

/**
 * For a comprehensive suite of test cases for standard SPARQL endpoints, see:
 * https://www.w3.org/2009/sparql/docs/tests/summary.html
 */

async function setWorldData(
  testContext: AppContext,
  worldId: string,
  ttl: string,
) {
  const parser = new Parser();
  const quads = parser.parse(ttl);
  const store = new Store();
  store.addQuads(quads);
  const blob = await generateBlobFromN3Store(store);
  const blobData = new Uint8Array(await blob.arrayBuffer());

  const managed = await testContext.libsql.manager.get(worldId);
  const blobsService = new BlobsService(managed.database);
  await blobsService.set(blobData, Date.now());
}

Deno.test("SPARQL API routes - GET operations", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);

  await t.step(
    "GET /v1/worlds/:world/sparql returns service description when no query",
    async () => {
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
      const worldsService = new WorldsService(testContext.libsql.database);
      await worldsService.insert({
        id: worldId,
        organization_id: organizationId,
        label: "Test World",
        description: "Test Description",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

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
});

Deno.test("SPARQL API routes - POST operations (Query)", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);

  await t.step(
    "POST /v1/worlds/:world/sparql (query parameter) executes SPARQL Query",
    async () => {
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
      const worldsService = new WorldsService(testContext.libsql.database);
      await worldsService.insert({
        id: worldId,
        organization_id: organizationId,
        label: "Test World",
        description: "Test Description",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      // Set up test data
      await setWorldData(
        testContext,
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
      if (res.status !== 200) {
        console.log("SPARQL Query POST failed:", await res.text());
        assertEquals(res.status, 200);
      }
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
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
      const worldsService = new WorldsService(testContext.libsql.database);
      await worldsService.insert({
        id: worldId,
        organization_id: organizationId,
        label: "Test World",
        description: "Test Description",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      // Set up test data
      await setWorldData(
        testContext,
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
      if (res.status !== 200) {
        console.log("SPARQL Query POST Response body:", await res.text());
      }
      assertEquals(res.status, 200);
      const json = await res.json();
      assert(json.head);
      assert(json.results);
      assert(json.results.bindings.length >= 1);
    },
  );
});

Deno.test("SPARQL API routes - POST operations (Update)", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);

  await t.step(
    "POST /v1/worlds/:world/sparql executes SPARQL Update",
    async () => {
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
      const worldsService = new WorldsService(testContext.libsql.database);
      await worldsService.insert({
        id: worldId,
        organization_id: organizationId,
        label: "Test World",
        description: "Test Description",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      // Set up initial data
      await setWorldData(
        testContext,
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
      if (res.status !== 204) {
        console.log("SPARQL Update failed:", await res.text());
        assertEquals(res.status, 204);
      }
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
});

Deno.test("SPARQL API routes - Error handling", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);

  await t.step(
    "POST /v1/worlds/:world/sparql returns 404 for non-existent world",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);

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
});

Deno.test("SPARQL API routes - Metrics", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);

  await t.step("SPARQL Query with Service Account meters usage", async () => {
    // 1. Setup Organization and Service Account
    const { id: orgId } = await createTestOrganization(testContext);
    const saId = ulid();
    const saKey = "sa-key-meter-sparql";
    const saService = new ServiceAccountsService(testContext.libsql.database);
    await saService.add({
      id: saId,
      organization_id: orgId,
      api_key: saKey,
      label: "Metered SA",
      description: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    // 2. Setup World
    const worldId = ulid();
    const worldsService = new WorldsService(testContext.libsql.database);
    await worldsService.insert({
      id: worldId,
      organization_id: orgId,
      label: "Metered World",
      description: "Desc",
      db_hostname: null,
      db_token: null,
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    });
    await testContext.libsql.manager.create(worldId);

    // 3. Perform SPARQL Query with SA Key
    const query = encodeURIComponent("SELECT ?s WHERE { ?s ?p ?o }");
    const req = new Request(
      `http://localhost/v1/worlds/${worldId}/sparql?query=${query}`,
      {
        method: "POST",
        headers: {
          "Accept": "application/sparql-results+json",
          "Authorization": `Bearer ${saKey}`,
        },
      },
    );

    const res = await app.fetch(req);
    assertEquals(res.status, 200);

    // 4. Verify Metric Recorded
    await new Promise((resolve) => setTimeout(resolve, 100));

    const metricsService = new MetricsService(testContext.libsql.database);
    const metric = await metricsService.getLast(saId, "sparql_query");

    assert(metric);
    assertEquals(metric.quantity, 1);
  });
});
