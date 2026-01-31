import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid";
import { createTestContext } from "#/server/testing.ts";
import createApp from "./route.ts";
import {
  tenantsAdd,
  tenantsFind,
} from "#/server/db/resources/tenants/queries.sql.ts";

Deno.test("Tenants API routes", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step(
    "GET /v1/tenants returns paginated list of tenants",
    async () => {
      const apiKey1 = ulid();
      const now1 = Date.now();
      await testContext.libsqlClient.execute({
        sql: tenantsAdd,
        args: [
          "tenant_1",
          null,
          "Test tenant 1",
          "free",
          apiKey1,
          now1,
          now1,
          null,
        ],
      });

      const apiKey2 = ulid();
      const now2 = Date.now();
      await testContext.libsqlClient.execute({
        sql: tenantsAdd,
        args: [
          "tenant_2",
          null,
          "Test tenant 2",
          "pro",
          apiKey2,
          now2,
          now2,
          null,
        ],
      });

      const req = new Request(
        "http://localhost/v1/tenants?page=1&pageSize=20",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 200);

      const tenants = await res.json();
      assert(Array.isArray(tenants));
      assert(tenants.length >= 2);
    },
  );
});

Deno.test("Tenants API routes - CRUD operations", async (t) => {
  const testContext = await createTestContext();
  const app = createApp(testContext);

  await t.step("POST /v1/tenants creates a new tenant", async () => {
    const req = new Request("http://localhost/v1/tenants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${testContext.admin!.apiKey}`,
      },
      body: JSON.stringify({
        id: "tenant_new",
        description: "Test tenant",
        plan: "free",
      }),
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 201);

    const body = await res.json();
    assertEquals(body.id, "tenant_new");
    assertEquals(body.description, "Test tenant");
    assertEquals(body.plan, "free");
  });

  await t.step("GET /v1/tenants/:tenant retrieves a tenant", async () => {
    const apiKey = ulid();
    const now = Date.now();
    await testContext.libsqlClient.execute({
      sql: tenantsAdd,
      args: [
        "tenant_get",
        null,
        "Test tenant 2",
        "pro",
        apiKey,
        now,
        now,
        null,
      ],
    });
    const tenantId = "tenant_get";

    const req = new Request(
      `http://localhost/v1/tenants/${tenantId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
      },
    );
    const res = await app.fetch(req);
    assertEquals(res.status, 200);

    const tenant = await res.json();
    assertEquals(tenant.description, "Test tenant 2");
    assertEquals(tenant.plan, "pro");
  });

  await t.step("PUT /v1/tenants/:tenant updates a tenant", async () => {
    const apiKey = ulid();
    const now = Date.now();
    await testContext.libsqlClient.execute({
      sql: tenantsAdd,
      args: [
        "tenant_put",
        "Original description",
        "free",
        apiKey,
        now,
        now,
        "tenant_put",
        null,
        "Original description",
        "free",
        apiKey,
        now,
        now,
        null,
      ],
    });
    const tenantId = "tenant_put";

    const req = new Request(
      `http://localhost/v1/tenants/${tenantId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
        body: JSON.stringify({
          description: "Updated description",
          plan: "pro",
        }),
      },
    );
    const res = await app.fetch(req);
    assertEquals(res.status, 204);

    const getRes = await app.fetch(
      new Request(
        `http://localhost/v1/tenants/${tenantId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      ),
    );
    const tenant = await getRes.json();
    assertEquals(tenant.description, "Updated description");
  });

  await t.step("DELETE /v1/tenants/:tenant removes a tenant", async () => {
    const apiKey = ulid();
    const now = Date.now();
    await testContext.libsqlClient.execute({
      sql: tenantsAdd,
      args: [
        "tenant_del",
        null,
        "To be deleted",
        "free",
        apiKey,
        now,
        now,
        null,
      ],
    });
    const tenantId = "tenant_del";

    const req = new Request(
      `http://localhost/v1/tenants/${tenantId}`,
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
        `http://localhost/v1/tenants/${tenantId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      ),
    );
    assertEquals(getRes.status, 404);
  });

  await t.step(
    "POST /v1/tenants/:tenant/rotate rotates tenant API key",
    async () => {
      const apiKey = ulid();
      const now = Date.now();
      await testContext.libsqlClient.execute({
        sql: tenantsAdd,
        args: [
          "tenant_rot",
          "Tenant to rotate",
          "free",
          apiKey,
          now,
          now,
          "tenant_rot",
          null,
          "Tenant to rotate",
          "free",
          apiKey,
          now,
          now,
          null,
        ],
      });
      const tenantId = "tenant_rot";

      const tenantResult = await testContext.libsqlClient.execute({
        sql: tenantsFind,
        args: [tenantId],
      });
      const originalApiKey = tenantResult.rows[0].api_key as string;

      const req = new Request(
        `http://localhost/v1/tenants/${tenantId}/rotate`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        },
      );
      const res = await app.fetch(req);
      assertEquals(res.status, 204);

      const getRes = await app.fetch(
        new Request(
          `http://localhost/v1/tenants/${tenantId}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${testContext.admin!.apiKey}`,
            },
          },
        ),
      );
      const tenant = await getRes.json();
      assert(tenant.apiKey !== originalApiKey);
    },
  );
});
