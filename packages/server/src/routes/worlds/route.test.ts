import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestNamespace,
  LocalWorlds,
  ROOT_NAMESPACE_ID,
  type WorldsContext,
  WorldsRepository,
} from "@wazoo/worlds-sdk";
import createRoute from "./route.ts";

Deno.test("Worlds API routes", async (t) => {
  await using testContext = (await createTestContext()) as WorldsContext;
  await using worlds = new LocalWorlds(testContext);
  testContext.engine = worlds;
  await worlds.init();

  const worldsRepository = new WorldsRepository(testContext.libsql.database);
  const app = createRoute(testContext);

  await t.step(
    "GET /worlds/:world returns world metadata (Admin)",
    async () => {
      const { id: _namespaceId, apiKey } = await createTestNamespace(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
      await worldsRepository.insert({
        id: worldId,
        namespace_id: ROOT_NAMESPACE_ID,
        slug: "test-world-" + worldId,
        label: "Test World",
        description: "Test Description",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      const resp = await app.fetch(
        new Request(`http://localhost/worlds/${worldId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 200);
      const world = await resp.json();
      assertEquals(world.label, "Test World");
    },
  );

  await t.step("POST /worlds creates a new world (Admin Only)", async () => {
    const { apiKey } = await createTestNamespace(testContext);

    const slug = ("new-world-" + ulid()).toLowerCase();
    const req = new Request("http://localhost/worlds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        slug,
        label: "New World",
        description: "New Description",
      }),
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 201);

    const world = await res.json();
    assertEquals(world.label, "New World");
  });

  await t.step(
    "GET /worlds/:world/export - Content Negotiation (Turtle)",
    async () => {
      const { id: _namespaceId, apiKey } = await createTestNamespace(
        testContext,
      );
      const worldId = ulid();
      const now = Date.now();
      await worldsRepository.insert({
        id: worldId,
        namespace_id: ROOT_NAMESPACE_ID,
        slug: "export-world-" + worldId,
        label: "Export World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      // Request with Turtle Accept header
      const resp = await app.fetch(
        new Request(`http://localhost/worlds/${worldId}/export`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "text/turtle",
          },
        }),
      );
      assertEquals(resp.status, 200);
      assertEquals(resp.headers.get("Content-Type"), "text/turtle");
    },
  );

  await t.step(
    "GET /worlds/:world returns 200 without Auth if no apiKey is set",
    async () => {
      await using unprotectedContext = await createTestContext();
      await using unprotectedWorlds = new LocalWorlds(unprotectedContext);
      unprotectedContext.engine = unprotectedWorlds;
      await unprotectedWorlds.init();

      unprotectedContext.apiKey = undefined;
      const unprotectedApp = createRoute(unprotectedContext);
      const worldId = ulid();
      const now = Date.now();
      const unprotectedWorldsRepository = new WorldsRepository(
        unprotectedContext.libsql.database,
      );
      await unprotectedWorldsRepository.insert({
        id: worldId,
        namespace_id: ROOT_NAMESPACE_ID,
        slug: "unprotected-world-" + worldId,
        label: "Unprotected World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await unprotectedContext.libsql.manager.create(worldId);

      const resp = await unprotectedApp.fetch(
        new Request(`http://localhost/worlds/${worldId}`, {
          method: "GET",
        }),
      );

      assertEquals(resp.status, 200);
      const world = await resp.json();
      assertEquals(world.label, "Unprotected World");
    },
  );
});
