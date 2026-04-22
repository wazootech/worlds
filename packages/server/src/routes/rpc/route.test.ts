import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import type { WorldsRegistry } from "@wazoo/worlds-sdk";
import {
  createTestNamespace,
  createTestRegistry,
  LocalWorlds,
} from "@wazoo/worlds-sdk";

Deno.test("Worlds RPC API", async (t) => {
  await using registry = (await createTestRegistry()) as WorldsRegistry;
  await using worlds = new LocalWorlds(registry);
  registry.activeEngine = worlds;
  await worlds.init();

  const worldsRepository = registry.management.worlds;
  const { createServer } = await import("../../server.ts");
  const app = await createServer(registry);

  await t.step(
    "POST /rpc (action: get) returns world metadata (Admin)",
    async () => {
      const { apiKey, id: namespaceId } = await createTestNamespace(
        registry,
      );
      const world = "test-world-" + ulid();
      const now = Date.now();
      // WorldsRepository insert uses internal record format
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
      // Storage create is now lazy or handled by engine

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
      assertEquals(worldResult.displayName, "Test World");
      assertEquals(worldResult.id, world);
    },
  );

  await t.step(
    "POST /rpc (action: create) creates a new world (Admin Only)",
    async () => {
      const { apiKey } = await createTestNamespace(registry);

      const world = ("new-world-" + ulid()).toLowerCase();
      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          action: "create",
          id: world,
          displayName: "New World",
          description: "New Description",
        }),
      });
      const response = await app.fetch(req);
      assertEquals(response.status, 201);

      const worldResult = await response.json();
      assertEquals(worldResult.displayName, "New World");
      assertEquals(worldResult.id, world);
    },
  );

  await t.step(
    "POST /rpc (action: export) - Content Negotiation (Turtle)",
    async () => {
      const { apiKey, id: namespaceId } = await createTestNamespace(
        registry,
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
      await using unprotectedRegistry = await createTestRegistry();
      await using unprotectedWorlds = new LocalWorlds(unprotectedRegistry);
      unprotectedRegistry.activeEngine = unprotectedWorlds;
      await unprotectedWorlds.init();

      unprotectedRegistry.apiKey = undefined as unknown as string;
      const appUnprotected = await createServer(unprotectedRegistry);
      const world = "unprotected-world-" + ulid();
      const now = Date.now();
      const unprotectedWorldsRepository = unprotectedRegistry.management.worlds;
      const namespace = unprotectedRegistry.namespace ?? "_";
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
      assertEquals(worldResult.displayName, "Unprotected World");
      assertEquals(worldResult.id, world);
    },
  );
});
