import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import { MetricsService } from "./service.ts";

Deno.test("MetricsService", async (t) => {
  const testContext = await createTestContext();
  const metricsService = new MetricsService(testContext.libsql.database);

  await t.step("meter inserts a metric with auto-increment ID", async () => {
    // Setup dependency
    await createTestOrganization(testContext);
    const serviceAccountId = ulid(); // Mock SA ID

    // Action
    await metricsService.meter({
      service_account_id: serviceAccountId,
      feature_id: "test-feature",
      quantity: 1,
      metadata: { foo: "bar" },
    });

    // Verify
    const rs = await testContext.libsql.database.execute(
      "SELECT * FROM metrics WHERE service_account_id = ?",
      [
        serviceAccountId,
      ],
    );
    assertEquals(rs.rows.length, 1);
    const row = rs.rows[0];
    assert(
      typeof row.id === "string",
      "ID should be a string (ULID)",
    );
    assertEquals(row.feature_id, "test-feature");
    assertEquals(row.quantity, 1);
  });
});
