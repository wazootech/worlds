import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import createRoute from "./route.ts";
import { createServer } from "#/server.ts";
import { BlobsService } from "#/lib/database/tables/blobs/service.ts";
import { ServiceAccountsService } from "#/lib/database/tables/service-accounts/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";

Deno.test("Worlds API routes", async (t) => {
  const testContext = await createTestContext();
  const worldsService = new WorldsService(testContext.libsql.database);
  const app = createRoute(testContext); // Keep createRoute for now, as createApp is not defined in the provided context. Assuming createRoute is the intended function.

  await t.step("GET /v1/worlds/:world returns world metadata", async () => {
    const { id: organizationId, apiKey } = await createTestOrganization(
      testContext,
    );
    const worldId = ulid();
    const now = Date.now();
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
      new Request(`http://localhost/v1/worlds/${worldId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }),
    );

    if (resp.status !== 200) {
      console.log("Response body:", await resp.text());
    }
    assertEquals(resp.status, 200);
    assertEquals(resp.headers.get("content-type"), "application/json");

    const world = await resp.json();
    assertEquals(world.organizationId, organizationId);
    assertEquals(world.label, "Test World");
    assert(typeof world.createdAt === "number");
    assert(typeof world.updatedAt === "number");
    assertEquals(world.deletedAt, null);
  });

  await t.step(
    "GET /v1/worlds/:world returns 404 for non-existent world",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);

      const resp = await app.fetch(
        new Request("http://localhost/v1/worlds/non-existent-world", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 404);
    },
  );

  await t.step(
    "GET /v1/worlds/:world returns 404 for deleted world",
    async () => {
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
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

      // Mark world as deleted
      // Mark world as deleted (soft delete)
      await worldsService.update(worldId, {
        deleted_at: Date.now(),
      });

      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 404);
    },
  );

  await t.step(
    "GET /v1/worlds/:world/export returns world data",
    async () => {
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
      const quads =
        "<http://example.org/s> <http://example.org/p> <http://example.org/o> <http://example.org/g> .";
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

      // Initialize world data in scoped DB
      const managed = await testContext.libsql.manager.create(worldId);
      const blobsService = new BlobsService(managed.database);
      await blobsService.set(new TextEncoder().encode(quads), now);

      // Test default (N-Quads)
      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/export`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 200);
      assertEquals(resp.headers.get("content-type"), "application/n-quads");
      const body = await resp.text();
      assert(body.includes("http://example.org/s"));

      // Test Turtle format via format param
      const turtleResp = await app.fetch(
        new Request(
          `http://localhost/v1/worlds/${worldId}/export?format=turtle`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            },
          },
        ),
      );

      assertEquals(turtleResp.status, 200);
      assertEquals(turtleResp.headers.get("content-type"), "text/turtle");
      const turtleBody = await turtleResp.text();
      assert(turtleBody.includes("<http://example.org/s>"));
    },
  );

  await t.step(
    "GET /v1/worlds/:world/export returns 401 for unauthorized",
    async () => {
      const { id: organizationId } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
      await worldsService.insert({
        id: worldId,
        organization_id: organizationId,
        label: "Test World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);
      await testContext.libsql.manager.create(worldId);

      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/export`, {
          method: "GET",
        }),
      );

      assertEquals(resp.status, 401);
    },
  );

  await t.step("POST /v1/worlds creates a new world", async () => {
    const { id: organizationId, apiKey } = await createTestOrganization(
      testContext,
    );

    const req = new Request("http://localhost/v1/worlds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        organizationId,
        label: "New World",
        description: "New Description",
      }),
    });
    const res = await app.fetch(req);
    if (res.status !== 201) {
      console.log("POST /v1/worlds failed:", await res.text());
      assertEquals(res.status, 201);
    }
    assertEquals(res.status, 201);

    const world = await res.json();
    assertEquals(world.label, "New World");
    assertEquals(world.description, "New Description");
    assert(typeof world.updatedAt === "number");
    assert(typeof world.id === "string");
    assert(typeof world.createdAt === "number");
    assert(typeof world.updatedAt === "number");
    assertEquals(world.deletedAt, null);
  });

  await t.step(
    "PUT /v1/worlds/:world updates world description",
    async () => {
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
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

      // Update description
      const updateResp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ description: "Updated description" }),
        }),
      );
      if (updateResp.status !== 204) {
        console.log("PUT /v1/worlds/:world failed:", await updateResp.text());
        assertEquals(updateResp.status, 204);
      }
      assertEquals(updateResp.status, 204);

      // Verify update
      const getResp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );
      assertEquals(getResp.status, 200);
      const world = await getResp.json();
      assertEquals(world.description, "Updated description");
    },
  );

  await t.step(
    "PUT /v1/worlds/:world returns 400 for invalid JSON",
    async () => {
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
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

      const invalidJsonResp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: "invalid-json",
        }),
      );
      assertEquals(invalidJsonResp.status, 400);
    },
  );

  await t.step(
    "PUT /v1/worlds/:world returns 404 for non-existent world",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);

      const updateResp = await app.fetch(
        new Request("http://localhost/v1/worlds/non-existent-world", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ description: "Test" }),
        }),
      );
      assertEquals(updateResp.status, 404);
    },
  );

  await t.step("DELETE /v1/worlds/:world deletes a world", async () => {
    const { id: organizationId, apiKey } = await createTestOrganization(
      testContext,
    );
    const worldId = ulid();
    const now = Date.now();
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

    // Delete world
    const deleteResp = await app.fetch(
      new Request(`http://localhost/v1/worlds/${worldId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }),
    );
    assertEquals(deleteResp.status, 204);

    // Verify deletion - should return 404
    const getResp = await app.fetch(
      new Request(`http://localhost/v1/worlds/${worldId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }),
    );
    assertEquals(getResp.status, 404);

    // Verify row deletion
    const dbResult = await worldsService.getById(worldId);
    assertEquals(dbResult, null);
  });

  await t.step(
    "GET /v1/worlds returns paginated list of worlds for organization",
    async () => {
      const { id: organizationId, apiKey } = await createTestOrganization(
        testContext,
      );

      const now1 = Date.now();
      const worldId1 = ulid();
      await worldsService.insert({
        id: worldId1,
        organization_id: organizationId,
        label: "Test World 1",
        description: "Test Description 1",
        db_hostname: null,
        db_token: null,
        created_at: now1,
        updated_at: now1,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId1);

      const now2 = Date.now();
      const worldId2 = ulid();
      await worldsService.insert({
        id: worldId2,
        organization_id: organizationId,
        label: "Test World 2",
        description: "Test Description 2",
        db_hostname: null,
        db_token: null,
        created_at: now2,
        updated_at: now2,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId2);

      const resp = await app.fetch(
        new Request(
          `http://localhost/v1/worlds?page=1&pageSize=20&organizationId=${organizationId}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            },
          },
        ),
      );

      assertEquals(resp.status, 200);
      const worlds = await resp.json();
      assert(Array.isArray(worlds));
      assert(worlds.length >= 2);

      const worldNames = worlds.map((w: { label: string }) => w.label);
      assert(worldNames.includes("Test World 1"));
      assert(worldNames.includes("Test World 2"));
    },
  );
});

Deno.test("Admin Organization Override", async (t) => {
  const testContext = await createTestContext();
  const { admin } = testContext;
  const app = await createServer(testContext);
  const adminApiKey = admin!.apiKey;
  const worldsService = new WorldsService(testContext.libsql.database); // Added for consistency

  await t.step(
    "Admin can list worlds for a specific organization",
    async () => {
      const organizationA = await createTestOrganization(
        testContext,
      );
      const organizationB = await createTestOrganization(
        testContext,
      );

      // Create world for Organization A
      const now1 = Date.now();
      const worldIdA = ulid();
      await worldsService.insert({
        id: worldIdA,
        organization_id: organizationA.id,
        label: "World A",
        description: "Description A",
        db_hostname: null,
        db_token: null,
        created_at: now1,
        updated_at: now1,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldIdA);

      // Create world for Organization B
      const now2 = Date.now();
      const worldIdB = ulid();
      await worldsService.insert({
        id: worldIdB,
        organization_id: organizationB.id,
        label: "World B",
        description: "Description B",
        db_hostname: null,
        db_token: null,
        created_at: now2,
        updated_at: now2,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldIdB);

      // Admin list for Organization A
      const respA = await app.fetch(
        new Request(
          `http://localhost/v1/worlds?organizationId=${organizationA.id}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${adminApiKey}`,
            },
          },
        ),
      );
      assertEquals(respA.status, 200);
      const bodyA = await respA.json();
      assertEquals(bodyA.length, 1);
      assertEquals(bodyA[0].label, "World A");

      // Admin list for Organization B
      const respB = await app.fetch(
        new Request(
          `http://localhost/v1/worlds?organizationId=${organizationB.id}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${adminApiKey}`,
            },
          },
        ),
      );
      assertEquals(respB.status, 200);
      const bodyB = await respB.json();
      assertEquals(bodyB.length, 1);
      assertEquals(bodyB[0].label, "World B");
    },
  );

  await t.step(
    "Admin can create world for a specific organization",
    async () => {
      const organizationC = await createTestOrganization(
        testContext,
      );

      const resp = await app.fetch(
        new Request(
          "http://localhost/v1/worlds",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${adminApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              organizationId: organizationC.id,
              label: "World C",
              description: "Created by Admin",
            }),
          },
        ),
      );
      assertEquals(resp.status, 201);
      const world = await resp.json();
      assertEquals(world.organizationId, organizationC.id);
      assertEquals(world.label, "World C");

      // Verify in DB
      const worldResult = await worldsService.getById(world.id);
      assert(worldResult);
      assertEquals(worldResult.organization_id, organizationC.id);
    },
  );
});

Deno.test("Worlds API routes - Metrics", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);
  const worldsService = new WorldsService(testContext.libsql.database);

  await t.step(
    "GET /v1/worlds/:world with Service Account meters usage",
    async () => {
      // 1. Setup Organization and Service Account
      const { id: orgId } = await createTestOrganization(testContext);
      const saId = ulid();
      const saKey = "sa-key-meter-worlds-get";
      const saService = new ServiceAccountsService(
        testContext.libsql.database,
      );
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

      // 3. Perform GET with SA Key
      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${saKey}`,
          },
        }),
      );

      assertEquals(resp.status, 200);

      // 4. Verify Metric Recorded
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metricsService = new MetricsService(testContext.libsql.database);
      const metric = await metricsService.getLast(saId, "worlds_get");

      assert(metric);
      assertEquals(metric.quantity, 1);
    },
  );

  await t.step(
    "POST /v1/worlds with Service Account meters usage",
    async () => {
      // 1. Setup Organization and Service Account
      const { id: orgId } = await createTestOrganization(testContext);
      const saId = ulid();
      const saKey = "sa-key-meter-worlds-create";
      const saService = new ServiceAccountsService(
        testContext.libsql.database,
      );
      await saService.add({
        id: saId,
        organization_id: orgId,
        api_key: saKey,
        label: "Metered SA",
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // 2. Perform POST with SA Key
      const resp = await app.fetch(
        new Request("http://localhost/v1/worlds", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${saKey}`,
          },
          body: JSON.stringify({
            organizationId: orgId,
            label: "New Metered World",
            description: "Desc",
          }),
        }),
      );

      assertEquals(resp.status, 201);

      // 3. Verify Metric Recorded
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metricsService = new MetricsService(testContext.libsql.database);
      const metric = await metricsService.getLast(saId, "worlds_create");

      assert(metric);
      assertEquals(metric.quantity, 1);
    },
  );
});
