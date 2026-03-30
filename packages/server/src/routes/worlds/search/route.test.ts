import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
  WorldsRepository,
} from "@wazoo/worlds-sdk";
import createRoute from "./route.ts";

Deno.test("World Search API routes", async (t) => {
  const testContext = await createTestContext();
  const worldsRepository = new WorldsRepository(testContext.libsql.database);
  const app = createRoute(testContext);

  await t.step("GET /worlds/:world/search (Admin)", async () => {
    const { apiKey } = await createTestOrganization(testContext);
    const worldId = ulid();
    const now = Date.now();
    await worldsRepository.insert({
      id: worldId,
      slug: "search-world-" + worldId,
      label: "Search World",
      description: "A world for searching",
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    await testContext.libsql.manager.create(worldId);

    const resp = await app.fetch(
      new Request(`http://localhost/worlds/${worldId}/search?query=test`, {
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
