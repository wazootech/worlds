import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestNamespace,
  LocalWorlds,
  WORLDS_WORLD_NAMESPACE,
  WorldsRepository,
} from "@wazoo/worlds-sdk";
import createRoute from "./route.ts";

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
    const slug = "search-world-" + ulid();
    const now = Date.now();
    await worldsRepository.insert({
      namespace_id: "_",
      slug,
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
      slug,
    });

    const resp = await app.fetch(
      new Request(`http://localhost/worlds/rpc/search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sources: [slug], query: "test" }),
      }),
    );

    assertEquals(resp.status, 200);
    const results = await resp.json();
    assert(Array.isArray(results));
  });
});
