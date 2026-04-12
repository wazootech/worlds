import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestNamespace,
  LocalWorlds,
  type WorldsContext,
} from "@wazoo/worlds-sdk";

Deno.test("Worlds API routes", async (t) => {
  await using testContext = (await createTestContext()) as WorldsContext;
  await using worlds = new LocalWorlds(testContext);
  testContext.engine = worlds;
  await worlds.init();

  const worldsRepository = new WorldsRepository(testContext.libsql.database);
  // Import createServer properly if not already there, or just use the one from server.ts
  const { createServer } = await import("../../server.ts");
  const app = await createServer(testContext);

  await t.step(
    "POST /worlds/rpc/get returns world metadata (Admin)",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const slug = "test-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace_id: "_",
        slug,
        label: "Test World",
        description: "Test Description",
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
        new Request(`http://localhost/worlds/rpc/get`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: { slug } }),
        }),
      );

      assertEquals(resp.status, 200);
      const world = await resp.json();
      assertEquals(world.label, "Test World");
      assertEquals(world.slug, slug);
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
    assertEquals(world.slug, slug);
  });

  await t.step(
    "POST /worlds/rpc/export - Content Negotiation (Turtle)",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const slug = "export-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace_id: "_",
        slug,
        label: "Export World",
        description: null,
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
        new Request(`http://localhost/worlds/rpc/export`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "text/turtle",
          },
          body: JSON.stringify({
            source: { slug },
            contentType: "text/turtle",
          }),
        }),
      );
      assertEquals(resp.status, 200);
      assertEquals(resp.headers.get("Content-Type"), "text/turtle");
    },
  );

  await t.step(
    "POST /worlds/rpc/get returns 200 without Auth if no apiKey is set",
    async () => {
      await using unprotectedContext = await createTestContext();
      await using unprotectedWorlds = new LocalWorlds(unprotectedContext);
      unprotectedContext.engine = unprotectedWorlds;
      await unprotectedWorlds.init();

      unprotectedContext.apiKey = undefined;
      const appUnprotected = await createServer(unprotectedContext);
      const slug = "unprotected-world-" + ulid();
      const now = Date.now();
      const unprotectedWorldsRepository = new WorldsRepository(
        unprotectedContext.libsql.database,
      );
      await unprotectedWorldsRepository.insert({
        namespace_id: "_",
        slug,
        label: "Unprotected World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await unprotectedContext.libsql.manager.create({
        namespace: "_",
        slug,
      });

      const resp = await appUnprotected.fetch(
        new Request(`http://localhost/worlds/rpc/get`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: { slug } }),
        }),
      );

      assertEquals(resp.status, 200);
      const world = await resp.json();
      assertEquals(world.label, "Unprotected World");
      assertEquals(world.slug, slug);
    },
  );
});
