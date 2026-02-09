import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import createApp from "./route.ts";
import { OrganizationsService } from "#/lib/database/tables/organizations/service.ts";
import { ServiceAccountsService } from "#/lib/database/tables/service-accounts/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";

Deno.test("Organizations API routes", async (t) => {
  const testContext = await createTestContext();
  const organizationsService = new OrganizationsService(testContext.database);
  const app = createApp(testContext);

  await t.step(
    "GET /v1/organizations returns paginated list of organizations",
    async () => {
      const now1 = Date.now();
      await organizationsService.add({
        id: "organization_1",
        label: "Test organization 1",
        description: "Test description 1",
        plan: "free",
        created_at: now1,
        updated_at: now1,
        deleted_at: null,
      });

      const now2 = Date.now();
      await organizationsService.add({
        id: "organization_2",
        label: "Test organization 2",
        description: "Test description 2",
        plan: "pro",
        created_at: now2,
        updated_at: now2,
        deleted_at: null,
      });

      const req = new Request(
        "http://localhost/v1/organizations?page=1&pageSize=20",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 200);

      const organizations = await res.json();
      assert(Array.isArray(organizations));
      assert(organizations.length >= 2);
    },
  );
});

Deno.test("Organizations API routes - CRUD operations", async (t) => {
  const testContext = await createTestContext();
  const organizationsService = new OrganizationsService(testContext.database);
  const app = createApp(testContext);

  await t.step(
    "POST /v1/organizations creates a new organization",
    async () => {
      const req = new Request("http://localhost/v1/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
        body: JSON.stringify({
          id: "organization_new",
          description: "Test organization",
          label: "Test Label",
          plan: "free",
        }),
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 201);

      const body = await res.json();
      assertEquals(body.id, "organization_new");
      assertEquals(body.description, "Test organization");
      assertEquals(body.label, "Test Label");
      assertEquals(body.plan, "free");
    },
  );

  await t.step(
    "GET /v1/organizations/:organization retrieves an organization",
    async () => {
      const now = Date.now();
      await organizationsService.add({
        id: "organization_get",
        label: "Test organization 2",
        description: "Test description 2",
        plan: "pro",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      const organizationId = "organization_get";

      const req = new Request(
        `http://localhost/v1/organizations/${organizationId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 200);

      const organization = await res.json();
      assertEquals(organization.label, "Test organization 2");
      assertEquals(organization.plan, "pro");
    },
  );

  await t.step(
    "PUT /v1/organizations/:organization updates an organization",
    async () => {
      const now = Date.now();
      await organizationsService.add({
        id: "organization_put",
        label: "Original label",
        description: "Original description",
        plan: "free",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      const organizationId = "organization_put";

      const req = new Request(
        `http://localhost/v1/organizations/${organizationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
          body: JSON.stringify({
            label: "Updated label",
            description: "Updated description",
            plan: "pro",
          }),
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 204);

      const getRes = await app.fetch(
        new Request(
          `http://localhost/v1/organizations/${organizationId}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${testContext.admin!.apiKey}`,
            },
          },
        ),
      );
      const organization = await getRes.json();
      assertEquals(organization.label, "Updated label");
      assertEquals(organization.description, "Updated description");
    },
  );

  await t.step(
    "DELETE /v1/organizations/:organization removes an organization",
    async () => {
      const now = Date.now();
      await organizationsService.add({
        id: "organization_del",
        label: "To be deleted",
        description: "Description",
        plan: "free",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      const organizationId = "organization_del";

      const req = new Request(
        `http://localhost/v1/organizations/${organizationId}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 204);

      const getRes = await app.fetch(
        new Request(
          `http://localhost/v1/organizations/${organizationId}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${testContext.admin!.apiKey}`,
            },
          },
        ),
      );
      assertEquals(getRes.status, 404);
    },
  );
});

Deno.test("Organizations API routes - Metrics", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step(
    "GET /v1/organizations/:organization with Service Account meters usage",
    async () => {
      // 1. Setup Organization and Service Account
      const org = await createTestOrganization(testContext);
      const saId = ulid();
      const saKey = "sa-key-meter-org-get";

      const saService = new ServiceAccountsService(testContext.database);
      await saService.add({
        id: saId,
        organization_id: org.id,
        api_key: saKey,
        label: "Metered SA",
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // 2. Perform GET with SA Key
      const resp = await app.fetch(
        new Request(`http://localhost/v1/organizations/${org.id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${saKey}`,
          },
        }),
      );

      assertEquals(resp.status, 200);

      // 3. Verify Metric Recorded
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metricsService = new MetricsService(testContext.database);
      const metric = await metricsService.getLast(saId, "organizations_get");

      assert(metric);
      assertEquals(metric.quantity, 1);
    },
  );
});
