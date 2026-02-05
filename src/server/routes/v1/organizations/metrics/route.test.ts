import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import { createTestContext, createTestOrganization } from "#/server/testing.ts";
import createRoute from "./route.ts";
import { ServiceAccountsService } from "#/server/databases/core/service-accounts/service.ts";
import { MetricsService } from "#/server/databases/core/metrics/service.ts";

Deno.test("Metrics API routes", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);
  const { admin } = testContext;
  const adminApiKey = admin!.apiKey;

  await t.step(
    "GET /v1/organizations/:organization/metrics returns metrics (empty for now)",
    async () => {
      const { id: organizationId } = await createTestOrganization(testContext);

      const resp = await app.fetch(
        new Request(
          `http://localhost/v1/organizations/${organizationId}/metrics`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${adminApiKey}`,
            },
          },
        ),
      );

      assertEquals(resp.status, 200);
      const metrics = await resp.json();
      assert(Array.isArray(metrics));
      assertEquals(metrics.length, 0);
    },
  );

  await t.step(
    "GET /v1/organizations/:organization/metrics requires auth",
    async () => {
      const { id: organizationId } = await createTestOrganization(testContext);
      const resp = await app.fetch(
        new Request(
          `http://localhost/v1/organizations/${organizationId}/metrics`,
          {
            method: "GET",
          },
        ),
      );
      assertEquals(resp.status, 401);
    },
  );

  await t.step(
    "GET /v1/organizations/:organization/metrics restricts access to correct org",
    async () => {
      // Admin can access all, so we need to test Service Account restrictions or lack thereof
      // if we had a non-admin user.
      // Testing service account access:
      const org1 = await createTestOrganization(testContext);
      const org2 = await createTestOrganization(testContext);

      // Create service account for Org 1
      const saId = ulid();
      const saKey = "sa-key-123";
      const saService = new ServiceAccountsService(testContext.database);
      await saService.add({
        id: saId,
        organization_id: org1.id,
        api_key: saKey,
        label: "Test SA",
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // SA for Org 1 accessing Org 1 -> OK
      const resp1 = await app.fetch(
        new Request(
          `http://localhost/v1/organizations/${org1.id}/metrics`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${saKey}`,
            },
          },
        ),
      );
      assertEquals(resp1.status, 200);

      // SA for Org 1 accessing Org 2 -> Forbidden
      const resp2 = await app.fetch(
        new Request(
          `http://localhost/v1/organizations/${org2.id}/metrics`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${saKey}`,
            },
          },
        ),
      );
      assertEquals(resp2.status, 403);

      // Verify that accessing its own org recorded a metric
      await new Promise((resolve) => setTimeout(resolve, 100));
      const metricsService = new MetricsService(testContext.database);
      const metric = await metricsService.getLast(saId, "metrics_query");

      assert(metric);
      assertEquals(metric.quantity, 1);
    },
  );

  await t.step(
    "GET /v1/organizations/:organization/metrics returns 404 for missing org",
    async () => {
      const resp = await app.fetch(
        new Request(
          `http://localhost/v1/organizations/missing-org/metrics`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${adminApiKey}`,
            },
          },
        ),
      );
      assertEquals(resp.status, 404);
    },
  );
});
