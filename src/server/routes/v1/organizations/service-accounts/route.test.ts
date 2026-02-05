import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import { createTestContext } from "#/server/testing.ts";
import createApp from "./route.ts";
import { OrganizationsService } from "#/server/databases/core/organizations/service.ts";
import { ServiceAccountsService } from "#/server/databases/core/service-accounts/service.ts";
import { MetricsService } from "#/server/databases/core/metrics/service.ts";

Deno.test("Service Accounts API routes", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);
  const organizationId = "org_" + ulid();
  const now = Date.now();

  // Create an organization to attach service accounts to
  // Create an organization to attach service accounts to
  const orgService = new OrganizationsService(testContext.database);
  await orgService.add({
    id: organizationId,
    label: "Test Org",
    description: "Description",
    plan: "free",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });

  await t.step(
    "GET /v1/organizations/:organization/service-accounts returns empty list initially",
    async () => {
      const req = new Request(
        `http://localhost/v1/organizations/${organizationId}/service-accounts`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 200);
      const accounts = await res.json();
      assertEquals(accounts, []);
    },
  );

  let createdAccountId: string;

  await t.step(
    "POST /v1/organizations/:organization/service-accounts creates a new service account",
    async () => {
      const req = new Request(
        `http://localhost/v1/organizations/${organizationId}/service-accounts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
          body: JSON.stringify({
            label: "Test Service Account",
            description: "A service account for testing",
          }),
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 201);
      const account = await res.json();
      assertEquals(account.label, "Test Service Account");
      assertEquals(account.description, "A service account for testing");
      assertEquals(account.organizationId, organizationId);
      assert(account.id);
      assert(account.apiKey);
      createdAccountId = account.id;
    },
  );

  await t.step(
    "GET /v1/organizations/:organization/service-accounts/:account retrieves a service account",
    async () => {
      const req = new Request(
        `http://localhost/v1/organizations/${organizationId}/service-accounts/${createdAccountId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 200);
      const account = await res.json();
      assertEquals(account.id, createdAccountId);
      assertEquals(account.label, "Test Service Account");
    },
  );

  await t.step(
    "PUT /v1/organizations/:organization/service-accounts/:account updates a service account",
    async () => {
      const req = new Request(
        `http://localhost/v1/organizations/${organizationId}/service-accounts/${createdAccountId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
          body: JSON.stringify({
            label: "Updated Service Account",
          }),
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 204);

      // Verify update
      const getReq = new Request(
        `http://localhost/v1/organizations/${organizationId}/service-accounts/${createdAccountId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const getRes = await app.fetch(getReq);
      const account = await getRes.json();
      assertEquals(account.label, "Updated Service Account");
      assertEquals(account.description, "A service account for testing"); // Should remain unchanged
    },
  );

  await t.step(
    "DELETE /v1/organizations/:organization/service-accounts/:account removes a service account",
    async () => {
      const req = new Request(
        `http://localhost/v1/organizations/${organizationId}/service-accounts/${createdAccountId}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 204);

      // Verify deletion
      const getReq = new Request(
        `http://localhost/v1/organizations/${organizationId}/service-accounts/${createdAccountId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const getRes = await app.fetch(getReq);
      assertEquals(getRes.status, 404);
    },
  );
});

Deno.test("Service Accounts API routes - Metrics", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);
  const organizationId = "org_" + ulid();
  const now = Date.now();

  // Create organization
  const orgService = new OrganizationsService(testContext.database);
  await orgService.add({
    id: organizationId,
    label: "Test Org",
    description: "Description",
    plan: "free",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });

  await t.step(
    "GET /v1/organizations/:organization/service-accounts with Service Account meters usage",
    async () => {
      // 1. Setup Acting Service Account
      const saId = ulid();
      const saKey = "sa-key-meter-sa-list";
      const saService = new ServiceAccountsService(testContext.database);
      await saService.add({
        id: saId,
        organization_id: organizationId,
        api_key: saKey,
        label: "Acting SA",
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // 2. Perform GET
      const resp = await app.fetch(
        new Request(
          `http://localhost/v1/organizations/${organizationId}/service-accounts`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${saKey}`,
            },
          },
        ),
      );
      assertEquals(resp.status, 200);

      // 3. Verify Metric
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metricsService = new MetricsService(testContext.database);
      const metric = await metricsService.getLast(
        saId,
        "service_accounts_list",
      );

      assert(metric);
      assertEquals(metric.quantity, 1);
    },
  );

  await t.step(
    "POST /v1/organizations/:organization/service-accounts with Service Account meters usage",
    async () => {
      // 1. Setup Acting Service Account
      const saId = ulid();
      const saKey = "sa-key-meter-sa-create";
      const saService = new ServiceAccountsService(testContext.database);
      await saService.add({
        id: saId,
        organization_id: organizationId,
        api_key: saKey,
        label: "Acting SA 2",
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // 2. Perform POST
      const resp = await app.fetch(
        new Request(
          `http://localhost/v1/organizations/${organizationId}/service-accounts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${saKey}`,
            },
            body: JSON.stringify({
              label: "Created by SA",
            }),
          },
        ),
      );
      assertEquals(resp.status, 201);

      // 3. Verify Metric
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metricsService = new MetricsService(testContext.database);
      const metric = await metricsService.getLast(
        saId,
        "service_accounts_create",
      );

      assert(metric);
      assertEquals(metric.quantity, 1);
    },
  );
});
