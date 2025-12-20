import { assert, assertEquals } from "@std/assert";
import { sqliteAppContext } from "#/server/app-context.ts";
import type { Limit } from "#/core/types/usage.ts";

Deno.test("SqliteLimitsService: Set and Get Limits", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.limitsService;

  const limit: Limit = {
    plan: "test-plan",
    quotaRequestsPerMin: 100,
    quotaStorageBytes: 1024 * 1024,
    allowReasoning: true,
  };

  await service.setLimits(limit);

  const retrieved = await service.getLimits(limit.plan);
  assert(retrieved);
  assertEquals(retrieved.plan, limit.plan);
  assertEquals(retrieved.quotaRequestsPerMin, limit.quotaRequestsPerMin);
  assertEquals(retrieved.quotaStorageBytes, limit.quotaStorageBytes);
  assertEquals(retrieved.allowReasoning, limit.allowReasoning);
});

Deno.test("SqliteLimitsService: Update Limits", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.limitsService;

  const initialLimit: Limit = {
    plan: "update-plan",
    quotaRequestsPerMin: 50,
    quotaStorageBytes: 500,
    allowReasoning: false,
  };

  await service.setLimits(initialLimit);

  const updatedLimit: Limit = {
    plan: "update-plan",
    quotaRequestsPerMin: 200,
    quotaStorageBytes: 2000,
    allowReasoning: true,
  };

  await service.setLimits(updatedLimit);

  const retrieved = await service.getLimits("update-plan");
  assert(retrieved);
  assertEquals(retrieved.quotaRequestsPerMin, 200);
  assertEquals(retrieved.quotaStorageBytes, 2000);
  assertEquals(retrieved.allowReasoning, true);
});

Deno.test("SqliteLimitsService: Get Non-existent Limit", async () => {
  const context = await sqliteAppContext(":memory:");
  const service = context.limitsService;

  const retrieved = await service.getLimits("non-existent-plan");
  assertEquals(retrieved, null);
});
