import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
  LogsRepository,
  WorldsRepository,
} from "@wazoo/worlds-sdk";
import createRoute from "./route.ts";

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

    const worldManaged = await testContext.libsql.manager.get(worldId);
    const logsRepository = new LogsRepository(worldManaged.database);
    await logsRepository.add({
      id: ulid(),
      world_id: worldId,
      message: "test log",
      level: "info",
      timestamp: Date.now(),
    });

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
