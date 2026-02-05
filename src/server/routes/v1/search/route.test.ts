import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import route from "./route.ts";
import sparqlRoute from "../worlds/sparql/route.ts";
import { OrganizationsService } from "#/server/databases/core/organizations/service.ts";
import { WorldsService } from "#/server/databases/core/worlds/service.ts";
import { ServiceAccountsService } from "#/server/databases/core/service-accounts/service.ts";
import { MetricsService } from "#/server/databases/core/metrics/service.ts";
import type { ManagedDatabase } from "../../../database-manager/database-manager.ts";
import { createTestContext } from "#/server/testing.ts";
import type { AppContext } from "#/server/app-context.ts";

Deno.test("Search API - End-to-End via SPARQL", async (t) => {
  const testContext = await createTestContext();
  const appContext = testContext as unknown as AppContext;
  const adminHandler = route(appContext);
  const sparqlHandler = sparqlRoute(appContext);
  const adminApiKey = testContext.admin!.apiKey;

  await t.step("SPARQL Insert -> Search Flow", async () => {
    try {
      const orgId = ulid();
      // Create organization
      const orgService = new OrganizationsService(testContext.database);
      await orgService.add({
        id: orgId,
        label: "Test Org",
        description: "Desc",
        plan: "free",
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      });

      const worldId = ulid();
      // Create world
      const worldsService = new WorldsService(testContext.database);
      await worldsService.insert({
        id: worldId,
        organization_id: orgId,
        label: "World",
        description: "Desc",
        db_hostname: null, // db_hostname
        db_token: null, // db_auth_token
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      });
      await testContext.databaseManager!.create(worldId);

      // 1. Execute SPARQL Update to insert data
      const sparqlUrl = `http://localhost/v1/worlds/${worldId}/sparql`;
      const updateQuery = `
        INSERT DATA {
          <http://example.org/s1> <http://example.org/p1> "The quick brown fox" .
        }
      `;

      const sparqlResp = await sparqlHandler.fetch(
        new Request(sparqlUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${adminApiKey}`,
            "Content-Type": "application/sparql-update",
          },
          body: updateQuery,
        }),
      );

      assertEquals(sparqlResp.status, 204);

      // 2. Search for the inserted data
      const searchUrl =
        `http://localhost/v1/search?q=fox&organizationId=${orgId}`;
      const searchResp = await adminHandler.fetch(
        new Request(searchUrl, {
          headers: { "Authorization": `Bearer ${adminApiKey}` },
        }),
      );

      assertEquals(searchResp.status, 200);
      const results = await searchResp.json();

      assertEquals(results.length, 1);
      assertEquals(results[0].subject, "http://example.org/s1");
      assertEquals(results[0].object, "The quick brown fox");

      // 3. Search with subject filter (should match)
      const searchUrlSubjectMatch =
        `http://localhost/v1/search?q=fox&organizationId=${orgId}&subjects=http://example.org/s1`;
      const searchRespSubjectMatch = await adminHandler.fetch(
        new Request(searchUrlSubjectMatch, {
          headers: { "Authorization": `Bearer ${adminApiKey}` },
        }),
      );
      const resultsSubjectMatch = await searchRespSubjectMatch.json();
      assertEquals(resultsSubjectMatch.length, 1);

      // 4. Search with subject filter (should not match)
      const searchUrlSubjectNoMatch =
        `http://localhost/v1/search?q=fox&organizationId=${orgId}&subjects=http://example.org/s2`;
      const searchRespSubjectNoMatch = await adminHandler.fetch(
        new Request(searchUrlSubjectNoMatch, {
          headers: { "Authorization": `Bearer ${adminApiKey}` },
        }),
      );
      const resultsSubjectNoMatch = await searchRespSubjectNoMatch.json();
      assertEquals(resultsSubjectNoMatch.length, 0);

      // 5. Search with predicate filter (should match)
      const searchUrlPredicateMatch =
        `http://localhost/v1/search?q=fox&organizationId=${orgId}&predicates=http://example.org/p1`;
      const searchRespPredicateMatch = await adminHandler.fetch(
        new Request(searchUrlPredicateMatch, {
          headers: { "Authorization": `Bearer ${adminApiKey}` },
        }),
      );
      const resultsPredicateMatch = await searchRespPredicateMatch.json();
      assertEquals(resultsPredicateMatch.length, 1);

      // 6. Search with predicate filter (should not match)
      const searchUrlPredicateNoMatch =
        `http://localhost/v1/search?q=fox&organizationId=${orgId}&predicates=http://example.org/p2`;
      const searchRespPredicateNoMatch = await adminHandler.fetch(
        new Request(searchUrlPredicateNoMatch, {
          headers: { "Authorization": `Bearer ${adminApiKey}` },
        }),
      );
      const resultsPredicateNoMatch = await searchRespPredicateNoMatch.json();
      assertEquals(resultsPredicateNoMatch.length, 0);
    } catch (error) {
      console.error("Test failed:", error);
      throw error;
    }
  });

  await t.step("SPARQL Delete -> Cascade Flow", async () => {
    // 1. Verify chunk exists (from previous step)
    const worldId =
      (await testContext.database.execute("SELECT id FROM worlds")).rows[0]
        .id as string;
    const sparqlHandler = sparqlRoute(appContext);
    const adminApiKey = testContext.admin!.apiKey;

    // Verify chunk count > 0
    const chunksBefore = await testContext.databaseManager!.get(worldId).then(
      (m: ManagedDatabase) =>
        m.database.execute("SELECT count(*) as count FROM chunks"),
    );
    const countBefore = chunksBefore.rows[0].count as number;
    assertEquals(countBefore > 0, true, "Chunks should exist before delete");

    // 2. SPARQL Delete
    const sparqlUrl = `http://localhost/v1/worlds/${worldId}/sparql`;
    const deleteQuery = `
      DELETE DATA {
        <http://example.org/s1> <http://example.org/p1> "The quick brown fox" .
      }
    `;

    const sparqlResp = await sparqlHandler.fetch(
      new Request(sparqlUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminApiKey}`,
          "Content-Type": "application/sparql-update",
        },
        body: deleteQuery,
      }),
    );
    assertEquals(sparqlResp.status, 204);

    // 3. Verify triple and chunk gone
    const triplesAfter = await testContext.databaseManager!.get(worldId).then(
      (m: ManagedDatabase) =>
        m.database.execute("SELECT count(*) as count FROM triples"),
    );
    assertEquals(triplesAfter.rows[0].count, 0, "Triples should be empty");

    const chunksAfter = await testContext.databaseManager!.get(worldId).then(
      (m: ManagedDatabase) =>
        m.database.execute("SELECT count(*) as count FROM chunks"),
    );
    assertEquals(
      chunksAfter.rows[0].count,
      0,
      "Chunks should be empty (cascade)",
    );
  });

  await t.step("Search with Service Account meters usage", async () => {
    // 1. Setup Organization and Service Account
    const orgId = ulid();
    const orgService = new OrganizationsService(testContext.database);
    await orgService.add({
      id: orgId,
      label: "Metered Org",
      description: "Desc",
      plan: "free",
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    });

    const saId = ulid();
    const saKey = "sa-key-meter-search";
    const saService = new ServiceAccountsService(testContext.database);
    await saService.add({
      id: saId,
      organization_id: orgId,
      api_key: saKey,
      label: "Metered SA",
      description: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    // 2. Setup World for the Org (otherwise search might return empty or error depending on validation)
    const worldId = ulid();
    const worldsService = new WorldsService(testContext.database);
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
    // Ensure managed database exists (though for metrics we just need the route to logic to run)
    await testContext.databaseManager!.create(worldId);

    // 3. Perform Search with SA Key
    const searchUrl =
      `http://localhost/v1/search?q=foo&organizationId=${orgId}`;
    const searchResp = await adminHandler.fetch(
      new Request(searchUrl, {
        headers: { "Authorization": `Bearer ${saKey}` },
      }),
    );

    assertEquals(searchResp.status, 200, "Search should succeed");

    // 4. Verify Metric Recorded
    // Metrics writing is fire-and-forget, so we might need a small wait,
    // but often in-memory SQL executes fast enough.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const metricsService = new MetricsService(testContext.database);
    const metric = await metricsService.getLast(saId, "semantic_search");

    if (!metric) {
      throw new Error("Metric not found");
    }
    assertEquals(metric.quantity, 1);
  });
});
