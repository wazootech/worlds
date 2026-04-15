import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestNamespace,
  LocalWorlds,
  WorldsRepository,
} from "@wazoo/worlds-sdk";

Deno.test("World Search API routes", async (t) => {
  await using testContext = await createTestContext();
  await using worlds = new LocalWorlds(testContext);
  testContext.engine = worlds;
  await worlds.init();

  const worldsRepository = new WorldsRepository(testContext.libsql.database);
  const { createServer } = await import("../../../server.ts");
  const app = await createServer(testContext);

  await t.step("POST /worlds-search (Admin)", async () => {
    const { apiKey } = await createTestNamespace(testContext);
    const world = "search-world-" + ulid();
    const now = Date.now();
    await worldsRepository.insert({
      namespace: "_",
      world,
      label: "Search World",
      description: "A world for searching",
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    await testContext.libsql.manager.create({
      namespace: "_",
      world,
    });

    const response = await app.fetch(
      new Request(`http://localhost/worlds/rpc/search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sources: [world], query: "test" }),
      }),
    );

    assertEquals(response.status, 200);
    const results = await response.json();
    assert(Array.isArray(results));
  });
});
