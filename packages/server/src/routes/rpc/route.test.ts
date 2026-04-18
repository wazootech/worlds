import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import type { WorldsContext } from "@wazoo/worlds-sdk";
import {
  createTestContext,
  createTestNamespace,
  LocalWorlds,
} from "@wazoo/worlds-sdk";

Deno.test("Worlds RPC API", async (t) => {
  await using testContext = (await createTestContext()) as WorldsContext;
  await using worlds = new LocalWorlds(testContext);
  testContext.engine = worlds;
  await worlds.init();

  const worldsRepository = testContext.management.worlds;
  const { createServer } = await import("../../server.ts");
  const app = await createServer(testContext);

  await t.step(
    "POST /rpc (action: get) returns world metadata (Admin)",
    async () => {
      const { apiKey, id: namespaceId } = await createTestNamespace(
        testContext,
      );
      const world = "test-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace: namespaceId,
        id: world,
        label: "Test World",
        description: "Test Description",
        connection_uri: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.storage.create({
        namespace: namespaceId,
        id: world,
      });

      const response = await app.fetch(
        new Request(`http://localhost/rpc`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "get",
            source: `${namespaceId}/${world}`,
          }),
        }),
      );

      assertEquals(response.status, 200);
      const worldResult = await response.json();
      assertEquals(worldResult.label, "Test World");
      assertEquals(worldResult.id, world);
    },
  );

  await t.step(
    "POST /rpc (action: create) creates a new world (Admin Only)",
    async () => {
      const { apiKey } = await createTestNamespace(testContext);

      const world = ("new-world-" + ulid()).toLowerCase();
      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          action: "create",
          name: world,
          label: "New World",
          description: "New Description",
        }),
      });
      const response = await app.fetch(req);
      assertEquals(response.status, 201);

      const worldResult = await response.json();
      assertEquals(worldResult.label, "New World");
      assertEquals(worldResult.id, world);
    },
  );

  await t.step(
    "POST /rpc (action: export) - Content Negotiation (Turtle)",
    async () => {
      const { apiKey, id: namespaceId } = await createTestNamespace(
        testContext,
      );
      const world = "export-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace: namespaceId,
        id: world,
        label: "Export World",
        description: undefined,
        connection_uri: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.storage.create({
        namespace: namespaceId,
        id: world,
      });

      const response = await app.fetch(
        new Request(`http://localhost/rpc`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "text/turtle",
          },
          body: JSON.stringify({
            action: "export",
            source: `${namespaceId}/${world}`,
            contentType: "text/turtle",
          }),
        }),
      );
      assertEquals(response.status, 200);
      assertEquals(response.headers.get("Content-Type"), "text/turtle");
    },
  );

  await t.step(
    "POST /rpc (action: get) returns 200 without Auth if no apiKey is set",
    async () => {
      await using unprotectedContext = await createTestContext();
      await using unprotectedWorlds = new LocalWorlds(unprotectedContext);
      unprotectedContext.engine = unprotectedWorlds;
      await unprotectedWorlds.init();

      unprotectedContext.apiKey = undefined;
      const appUnprotected = await createServer(unprotectedContext);
      const world = "unprotected-world-" + ulid();
      const now = Date.now();
      const unprotectedWorldsRepository = unprotectedContext.management.worlds;
      const namespace = unprotectedContext.namespace ?? "_";
      await unprotectedWorldsRepository.insert({
        namespace,
        id: world,
        label: "Unprotected World",
        description: undefined,
        connection_uri: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await unprotectedContext.storage.create({
        namespace,
        id: world,
      });

      const response = await appUnprotected.fetch(
        new Request(`http://localhost/rpc`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "get",
            source: `${namespace}/${world}`,
          }),
        }),
      );

      assertEquals(response.status, 200);
      const worldResult = await response.json();
      assertEquals(worldResult.label, "Unprotected World");
      assertEquals(worldResult.id, world);
    },
  );
});
