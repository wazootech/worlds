import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
  createTestServiceAccount,
} from "#/lib/testing/context.ts";
import createRoute from "./route.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";

Deno.test("World Search API routes", async (t) => {
  const testContext = await createTestContext();
  const worldsService = new WorldsService(testContext.libsql.database);
  const app = createRoute(testContext);

  await t.step("GET /v1/worlds/:world/search returns results", async () => {
    const { id: organizationId, apiKey } = await createTestOrganization(
      testContext,
    );
    const worldId = ulid();
    const now = Date.now();
    await worldsService.insert({
      id: worldId,
      organization_id: organizationId,
      label: "Search World",
      description: "A world for searching",
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    await testContext.libsql.manager.create(worldId);

    // Note: In a real search, we'd populate with chunks and vectors.
    // For this route test, we're mainly testing the wiring and authorization.
    // ChunksService uses mockEmbeddings in testContext.

    const resp = await app.fetch(
      new Request(`http://localhost/v1/worlds/${worldId}/search?query=test`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }),
    );

    assertEquals(resp.status, 200);
    const results = await resp.json();
    assert(Array.isArray(results));
  });

  await t.step("GET /v1/worlds/:world/search with filters", async () => {
    const { id: organizationId, apiKey } = await createTestOrganization(
      testContext,
    );
    const worldId = ulid();
    const now = Date.now();
    await worldsService.insert({
      id: worldId,
      organization_id: organizationId,
      label: "Search World",
      description: "A world for searching",
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    await testContext.libsql.manager.create(worldId);

    const resp = await app.fetch(
      new Request(
        `http://localhost/v1/worlds/${worldId}/search?query=test&subjects=s1&predicates=p1`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        },
      ),
    );

    assertEquals(resp.status, 200);
    const results = await resp.json();
    assert(Array.isArray(results));
  });

  await t.step(
    "GET /v1/worlds/:world/search returns 400 for missing query",
    async () => {
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
      await worldsService.insert({
        id: worldId,
        organization_id: organizationId,
        label: "Search World",
        description: "A world for searching",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/search`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 400);
    },
  );

  await t.step(
    "GET /v1/worlds/:world/search returns 400 for invalid limit",
    async () => {
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      await worldsService.insert({
        id: worldId,
        organization_id: organizationId,
        label: "Search World",
        description: "A world for searching",
        db_hostname: null,
        db_token: null,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      const resp = await app.fetch(
        new Request(
          `http://localhost/v1/worlds/${worldId}/search?query=test&limit=invalid`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            },
          },
        ),
      );

      assertEquals(resp.status, 400);
    },
  );

  await t.step(
    "GET /v1/worlds/:world/search returns 404 for non-existent world",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);

      const resp = await app.fetch(
        new Request(
          "http://localhost/v1/worlds/non-existent-world/search?query=test",
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            },
          },
        ),
      );

      assertEquals(resp.status, 404);
    },
  );

  await t.step(
    "GET /v1/worlds/:world/search returns 401 for unauthorized",
    async () => {
      const worldId = ulid();

      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/search?query=test`, {
          method: "GET",
        }),
      );

      assertEquals(resp.status, 401);
    },
  );

  await t.step(
    "GET /v1/worlds/:world/search returns 403 for forbidden",
    async () => {
      const orgA = await createTestOrganization(testContext);
      const orgB = await createTestOrganization(testContext);
      const { apiKey: saKeyB } = await createTestServiceAccount(
        testContext,
        orgB.id,
      );

      const worldIdA = ulid();
      const now = Date.now();
      await worldsService.insert({
        id: worldIdA,
        organization_id: orgA.id,
        label: "World A",
        description: "A world",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldIdA);

      const resp = await app.fetch(
        new Request(
          `http://localhost/v1/worlds/${worldIdA}/search?query=test`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${saKeyB}`,
            },
          },
        ),
      );

      assertEquals(resp.status, 403);
    },
  );

  await t.step(
    "GET /v1/worlds/:world/search with Service Account meters usage",
    async () => {
      const { id: orgId } = await createTestOrganization(testContext);
      const { id: saId, apiKey: saKey } = await createTestServiceAccount(
        testContext,
        orgId,
      );

      const worldId = ulid();
      const now = Date.now();
      await worldsService.insert({
        id: worldId,
        organization_id: orgId,
        label: "Metered World",
        description: "Desc",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/search?query=test`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${saKey}`,
          },
        }),
      );

      assertEquals(resp.status, 200);

      // Verify Metric Recorded
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metricsService = new MetricsService(testContext.libsql.database);
      const metric = await metricsService.getLast(saId, "semantic_search");

      assert(metric);
      assertEquals(metric.quantity, 1);
    },
  );
});
