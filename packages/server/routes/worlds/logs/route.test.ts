import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import createRoute from "./route.ts";
import { WorldsRepository } from "#/lib/database/tables/worlds/service.ts";

Deno.test("World Logs API routes", async (t) => {
  const testContext = await createTestContext();
  const worldsRepository = new WorldsRepository(testContext.libsql.database);
  const app = createRoute(testContext);

  await t.step("GET /worlds/:world/logs (Admin)", async () => {
    const { apiKey } = await createTestOrganization(testContext);
    const worldId = ulid();
    const now = Date.now();
    await worldsRepository.insert({
      id: worldId,
      slug: "logs-world-" + worldId,
      label: "Logs World",
      description: null,
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    await testContext.libsql.manager.create(worldId);

    const resp = await app.fetch(
      new Request(`http://localhost/worlds/${worldId}/logs`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }),
    );

    assertEquals(resp.status, 200);
    const logs = await resp.json();
    assert(Array.isArray(logs));
  });
});
