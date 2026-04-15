import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import {
  createTestContext,
  createTestNamespace,
  LocalWorlds,
  WorldsRepository,
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
      const world = "test-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace: "_",
        world,
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
        world,
      });

      const response = await app.fetch(
        new Request(`http://localhost/worlds/rpc/get`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: { world } }),
        }),
      );

      assertEquals(response.status, 200);
      const worldResult = await response.json();
      assertEquals(worldResult.label, "Test World");
      assertEquals(worldResult.world, world);
    },
  );

  await t.step("POST /worlds creates a new world (Admin Only)", async () => {
    const { apiKey } = await createTestNamespace(testContext);

    const world = ("new-world-" + ulid()).toLowerCase();
    const req = new Request("http://localhost/worlds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        world,
        label: "New World",
        description: "New Description",
      }),
    });
    const response = await app.fetch(req);
    assertEquals(response.status, 201);

    const worldResult = await response.json();
    assertEquals(worldResult.label, "New World");
    assertEquals(worldResult.world, world);
  });

  await t.step(
    "POST /worlds/rpc/export - Content Negotiation (Turtle)",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const world = "export-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace: "_",
        world,
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
        world,
      });

      const response = await app.fetch(
        new Request(`http://localhost/worlds/rpc/export`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "text/turtle",
          },
          body: JSON.stringify({
            source: { world },
            contentType: "text/turtle",
          }),
        }),
      );
      assertEquals(response.status, 200);
      assertEquals(response.headers.get("Content-Type"), "text/turtle");
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
      const world = "unprotected-world-" + ulid();
      const now = Date.now();
      const unprotectedWorldsRepository = new WorldsRepository(
        unprotectedContext.libsql.database,
      );
      await unprotectedWorldsRepository.insert({
        namespace: "_",
        world,
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
        world,
      });

      const response = await appUnprotected.fetch(
        new Request(`http://localhost/worlds/rpc/get`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: { world } }),
        }),
      );

      assertEquals(response.status, 200);
      const worldResult = await response.json();
      assertEquals(worldResult.label, "Unprotected World");
      assertEquals(worldResult.world, world);
    },
  );
});
