import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid";
import { createTestContext } from "@wazoo/api";
import { createServer } from "@wazoo/api";
import { WorldsSdk } from "#/sdk.ts";
import { createTestOrganization } from "@wazoo/api";
import { ServiceAccountsService } from "@wazoo/api";
import { MetricsService } from "@wazoo/api";

Deno.test("Metrics SDK", async (t) => {
  const testContext = await createTestContext();
  const app = await createServer(testContext);

  // Setup Organization and Service Account
  const { id: orgId, apiKey: orgApiKey } = await createTestOrganization(
    testContext,
  );

  const saId = ulid();
  const saKey = "sa-key-metrics-test";
  const saService = new ServiceAccountsService(testContext.database);
  await saService.add({
    id: saId,
    organization_id: orgId,
    api_key: saKey,
    label: "Metrics Test SA",
    description: null,
    created_at: Date.now(),
    updated_at: Date.now(),
  });

  // Setup SDK
  const sdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: orgApiKey, // Use Org API Key to list metrics (Admin/Org Owner role)
    fetch: (input, init) => {
      if (typeof input === "string") {
        return app.fetch(new Request(input, init));
      } else if (input instanceof URL) {
        return app.fetch(new Request(input.toString(), init));
      } else {
        return app.fetch(input);
      }
    },
  });

  // Seed some metrics directly into the database
  const metricsService = new MetricsService(testContext.database);
  const now = Date.now();
  await metricsService.meter({
    service_account_id: saId,
    feature_id: "test_feature_1",
    quantity: 10,
    metadata: { key: "v1" },
  });
  await metricsService.meter({
    service_account_id: saId,
    feature_id: "test_feature_2",
    quantity: 5,
    metadata: { key: "v2" },
  });
  // Add a metric for another service account (if we had one, but let's just use a dummy ID)
  await metricsService.meter({
    service_account_id: "other_sa",
    feature_id: "test_feature_1",
    quantity: 1,
  });

  await t.step("list all metrics for organization", async () => {
    const metrics = await sdk.organizations.metrics.list(orgId);
    assert(Array.isArray(metrics));
    // Note: our seed above added 3 metrics. organizationId is linked via service_accounts table.
    // saId is linked to orgId. "other_sa" is NOT linked to orgId in our test setup yet.
    // Actually, "other_sa" isn't even in the service_accounts table, so the JOIN will exclude it.
    assertEquals(metrics.length, 2);
  });

  await t.step("list metrics with pagination", async () => {
    const page1 = await sdk.organizations.metrics.list(orgId, {
      page: 1,
      pageSize: 1,
    });
    assertEquals(page1.length, 1);

    const page2 = await sdk.organizations.metrics.list(orgId, {
      page: 2,
      pageSize: 1,
    });
    assertEquals(page2.length, 1);
    assert(page1[0].id !== page2[0].id);
  });

  await t.step("list metrics with filtering", async () => {
    const feature1 = await sdk.organizations.metrics.list(orgId, {
      featureId: "test_feature_1",
    });
    assertEquals(feature1.length, 1);
    assertEquals(feature1[0].featureId, "test_feature_1");

    // Filter by timestamp
    const filtered = await sdk.organizations.metrics.list(orgId, {
      start: now + 5000,
    });
    assert(Array.isArray(filtered));
  });
});
