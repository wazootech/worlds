import { assert, assertEquals } from "@std/assert";
import { createTestContext } from "#/server/testing.ts";
import createRoute from "./route.ts";

Deno.test("Plans API routes - GET operations", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const app = createRoute(testContext);

  await t.step("GET /v1/plans/:plan retrieves an existing plan", async () => {
    // Delete plan if it exists
    await db.plans.delete("free");

    // Create a plan directly using db.set() since planType is the primary key
    const result = await db.plans.set("free", {
      planType: "free",
      quotaRequestsPerMin: 60,
      quotaStorageBytes: 104857600,
    });

    if (!result.ok) {
      throw new Error("Failed to create test plan");
    }

    // Verify the plan was created
    const verifyPlan = await db.plans.find("free");
    if (!verifyPlan) {
      throw new Error("Plan was not created successfully");
    }

    // Then retrieve it via the route
    const req = new Request("http://localhost/v1/plans/free", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${testContext.admin!.apiKey}`,
      },
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 200);

    const plan = await res.json();
    assertEquals(plan.planType, "free");
    assertEquals(plan.quotaRequestsPerMin, 60);
    assertEquals(plan.quotaStorageBytes, 104857600);
  });

  await t.step(
    "GET /v1/plans/:plan returns 404 for non-existent plan type",
    async () => {
      const req = new Request("http://localhost/v1/plans/nonexistent", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 404);
    },
  );

  await t.step(
    "GET /v1/plans/:plan returns 401 without valid auth",
    async () => {
      const req = new Request("http://localhost/v1/plans/free", {
        method: "GET",
        headers: {
          "Authorization": "Bearer invalid-token",
        },
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 401);
    },
  );

  testContext.kv.close();
});

Deno.test("Plans API routes - PUT operations", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const app = createRoute(testContext);

  await t.step("PUT /v1/plans/:plan updates an existing plan", async () => {
    // Delete plan if it exists
    await db.plans.delete("pro");

    // First create a plan
    const createResult = await db.plans.set("pro", {
      planType: "pro",
      quotaRequestsPerMin: 100,
      quotaStorageBytes: 209715200,
    });

    if (!createResult.ok) {
      throw new Error("Failed to create test plan");
    }

    // Then update it
    const req = new Request("http://localhost/v1/plans/pro", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${testContext.admin!.apiKey}`,
      },
      body: JSON.stringify({
        planType: "pro",
        quotaRequestsPerMin: 200,
        quotaStorageBytes: 419430400,
      }),
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 204);

    // Verify the update
    const getRes = await app.fetch(
      new Request("http://localhost/v1/plans/pro", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
      }),
    );
    const plan = await getRes.json();
    assertEquals(plan.quotaRequestsPerMin, 200);
    assertEquals(plan.quotaStorageBytes, 419430400);
  });

  await t.step(
    "PUT /v1/plans/:plan creates a new plan if it doesn't exist",
    async () => {
      // Delete the plan if it exists
      await db.plans.delete("free");

      // Try to update a non-existent plan (should create it)
      const req = new Request("http://localhost/v1/plans/free", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
        body: JSON.stringify({
          planType: "free",
          quotaRequestsPerMin: 50,
          quotaStorageBytes: 52428800,
        }),
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 204);

      // Verify it was created
      const getRes = await app.fetch(
        new Request("http://localhost/v1/plans/free", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        }),
      );
      assertEquals(getRes.status, 200);
      const plan = await getRes.json();
      assertEquals(plan.quotaRequestsPerMin, 50);
      assertEquals(plan.quotaStorageBytes, 52428800);
    },
  );

  await t.step(
    "PUT /v1/plans/:plan returns 401 without valid auth",
    async () => {
      const req = new Request("http://localhost/v1/plans/free", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer invalid-token",
        },
        body: JSON.stringify({
          planType: "free",
          quotaRequestsPerMin: 60,
          quotaStorageBytes: 104857600,
        }),
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 401);
    },
  );

  await t.step(
    "PUT /v1/plans/:plan returns 403 without admin access",
    async () => {
      // Create a non-admin account
      const createResult = await db.accounts.add({
        id: "acc_plans_test",
        description: "Test account",
        planType: "free",
        apiKey: "test-api-key-456",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });

      if (!createResult.ok) {
        throw new Error("Failed to create test account");
      }

      const req = new Request("http://localhost/v1/plans/free", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer test-api-key-456",
        },
        body: JSON.stringify({
          planType: "free",
          quotaRequestsPerMin: 60,
          quotaStorageBytes: 104857600,
        }),
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 403);
    },
  );

  await t.step(
    "PUT /v1/plans/:plan returns 400 for plan mismatch",
    async () => {
      const req = new Request("http://localhost/v1/plans/free", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
        body: JSON.stringify({
          planType: "pro",
          quotaRequestsPerMin: 60,
          quotaStorageBytes: 104857600,
        }),
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 400);
    },
  );

  await t.step(
    "PUT /v1/plans/:plan ignores allowReasoning field",
    async () => {
      // Delete plan if it exists
      await db.plans.delete("pro");

      // Create a plan
      const createResult = await db.plans.set("pro", {
        planType: "pro",
        quotaRequestsPerMin: 100,
        quotaStorageBytes: 209715200,
      });

      if (!createResult.ok) {
        throw new Error("Failed to create test plan");
      }

      // Update with allowReasoning (should be ignored)
      const req = new Request("http://localhost/v1/plans/pro", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testContext.admin!.apiKey}`,
        },
        body: JSON.stringify({
          planType: "pro",
          quotaRequestsPerMin: 150,
          quotaStorageBytes: 314572800,
          allowReasoning: true, // This should be ignored
        }),
      });
      const res = await app.fetch(req);
      assertEquals(res.status, 204);

      // Verify update succeeded (allowReasoning is not stored)
      const getRes = await app.fetch(
        new Request("http://localhost/v1/plans/pro", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${testContext.admin!.apiKey}`,
          },
        }),
      );
      const plan = await getRes.json();
      assertEquals(plan.quotaRequestsPerMin, 150);
      assertEquals(plan.quotaStorageBytes, 314572800);
      // allowReasoning is not in the response since it's not in the schema
      assert(!("allowReasoning" in plan));
    },
  );

  testContext.kv.close();
});
