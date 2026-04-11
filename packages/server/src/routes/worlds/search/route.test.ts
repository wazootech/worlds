import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestNamespace,
  LocalWorlds,
  REGISTRY_NAMESPACE_ID,
  WorldsRepository,
} from "@wazoo/worlds-sdk";
import createRoute from "./route.ts";

Deno.test("World Search API routes", async (t) => {
  await using testContext = await createTestContext();
  await using worlds = new LocalWorlds(testContext);
  testContext.engine = worlds;
  await worlds.init();

  const worldsRepository = new WorldsRepository(testContext.libsql.database);
  const app = createRoute(testContext);

  await t.step("GET /worlds/:world/search (Admin)", async () => {
    const { apiKey } = await createTestNamespace(testContext);
    const slug = "search-world-" + ulid();
    const now = Date.now();
    await worldsRepository.insert({
      namespace_id: REGISTRY_NAMESPACE_ID,
      slug,
      label: "Search World",
      description: "A world for searching",
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    await testContext.libsql.manager.create(REGISTRY_NAMESPACE_ID, slug);

    const resp = await app.fetch(
      new Request(`http://localhost/worlds/${slug}/search?query=test`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }),
    );

    assertEquals(resp.status, 200);
    const results = await resp.json();
    assert(Array.isArray(results));
  });
});


