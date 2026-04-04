import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestNamespace,
  LocalWorlds,
  LogsRepository,
  REGISTRY_NAMESPACE_ID,
  WorldsRepository,
} from "@wazoo/worlds-sdk";
import createRoute from "./route.ts";

Deno.test("World Logs API routes", async (t) => {
  await using testContext = await createTestContext();
  await using worlds = new LocalWorlds(testContext);
  testContext.engine = worlds;
  await worlds.init();

  const worldsRepository = new WorldsRepository(testContext.libsql.database);
  const app = createRoute(testContext);

  await t.step("GET /worlds/:world/logs (Admin)", async () => {
    const { apiKey } = await createTestNamespace(testContext);
    const worldSlug = "logs-world-" + ulid();
    const now = Date.now();
    await worldsRepository.insert({
      namespace_id: REGISTRY_NAMESPACE_ID,
      slug: worldSlug,
      label: "Logs World",
      description: null,
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    await testContext.libsql.manager.create(REGISTRY_NAMESPACE_ID, worldSlug);

    const worldManaged = await testContext.libsql.manager.get(
      REGISTRY_NAMESPACE_ID,
      worldSlug,
    );
    const logsRepository = new LogsRepository(worldManaged.database);
    await logsRepository.add({
      id: ulid(),
      world_id: worldSlug,
      message: "test log",
      level: "info",
      timestamp: Date.now(),
    });

    const resp = await app.fetch(
      new Request(`http://localhost/worlds/${worldSlug}/logs`, {
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
