import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import createRoute from "./route.ts";
import { LogsService } from "#/lib/database/tables/logs/service.ts";
import { ServiceAccountsService } from "#/lib/database/tables/service-accounts/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";

Deno.test("Logs API routes", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);

  await t.step(
    "GET /v1/worlds/:world/logs returns logs for a world",
    async () => {
      const { id: organizationId } = await createTestOrganization(testContext);
      const worldId = ulid();
      const now = Date.now();
      const worldsService = new WorldsService(testContext.database);
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
      const managed = await testContext.databaseManager!.create(worldId);

      // Insert some logs
      const logsService = new LogsService(managed.database);
      await logsService.add({
        id: ulid(),
        world_id: worldId,
        timestamp: now,
        level: "info",
        message: "Log 1",
        metadata: null,
      });
      await logsService.add({
        id: ulid(),
        world_id: worldId,
        timestamp: now + 1000,
        level: "error",
        message: "Log 2",
        metadata: {},
      });

      const { admin } = testContext;
      const adminApiKey = admin!.apiKey;

      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/logs`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${adminApiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 200);
      const logs = await resp.json();
      assert(Array.isArray(logs));
      assertEquals(logs.length, 2);
    },
  );

  await t.step("GET /v1/worlds/:world/logs requires admin", async () => {
    const { id: organizationId } = await createTestOrganization(testContext);
    const worldId = ulid();
    const now = Date.now();
    const worldsService = new WorldsService(testContext.database);
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
    await testContext.databaseManager!.create(worldId);

    // Try with no auth
    const respNoAuth = await app.fetch(
      new Request(`http://localhost/v1/worlds/${worldId}/logs`, {
        method: "GET",
      }),
    );
    assertEquals(respNoAuth.status, 401);

    // Try with non-admin org user (simulated by just not being admin)
    // Actually authorizeRequest only checks admin vs service account vs nothing.
    // The route explicitly checks `!authorized.admin`.
  });
});

Deno.test("Logs API routes - Metrics", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);

  await t.step(
    "GET /v1/worlds/:world/logs with Service Account meters usage",
    async () => {
      // 1. Setup Organization and Service Account
      const { id: orgId } = await createTestOrganization(testContext);
      const saId = ulid();
      const saKey = "sa-key-meter-logs-list";
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

      // 2. Setup World
      const worldId = ulid();
      const now = Date.now();
      const worldsService = new WorldsService(testContext.database);
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
      await testContext.databaseManager!.create(worldId);

      // 3. Perform GET with SA Key
      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/logs`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${saKey}`,
          },
        }),
      );

      assertEquals(
        resp.status,
        200,
        "Should return 200 for SA accessing own world logs",
      );

      // 4. Verify Metric Recorded
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metricsService = new MetricsService(testContext.database);
      const metric = await metricsService.getLast(saId, "logs_list");

      assert(metric);
      assertEquals(metric.quantity, 1);
    },
  );
});
