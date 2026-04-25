import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import { ApiKeyRepository, SecureWorlds, Worlds } from "@wazoo/worlds-sdk";
import { createServer } from "../../server.ts";

Deno.test("Worlds RPC API", async (t) => {
  const worlds = new Worlds();
  await using _ = {
    [Symbol.asyncDispose]: () => worlds[Symbol.asyncDispose](),
  };

  const apiKeyRepository = new ApiKeyRepository();
  const namespace = "_";
  const testApiKey = `test-key-${ulid()}`;
  await apiKeyRepository.create(testApiKey, namespace);

  const secureWorlds = new SecureWorlds({
    worlds,
    apiKeyRepository,
  });

  const app = createServer(secureWorlds);

  await t.step(
    "POST /rpc (action: get) returns world metadata (Admin)",
    async () => {
      const world = "test-world-" + ulid();
      const created = await worlds.createWorld({
        id: world,
        displayName: "Test World",
        description: "Test Description",
      });

      const response = await app.fetch(
        new Request(`http://localhost/rpc`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "get",
            source: created.id,
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
    "POST /rpc (action: create) creates a new world",
    async () => {
      const world = ("new-world-" + ulid()).toLowerCase();
      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    "POST /rpc (action: list) returns list of worlds",
    async () => {
      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "list",
        }),
      });
      const response = await app.fetch(req);
      assertEquals(response.status, 200);

      const result = await response.json();
      assertEquals(result.worlds.length >= 2, true);
    },
  );

  await t.step(
    "POST /rpc (action: update) updates a world",
    async () => {
      const world = "update-world-" + ulid();
      await worlds.createWorld({
        id: world,
        displayName: "Original Name",
      });

      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update",
          source: world,
          displayName: "Updated Name",
          description: "Updated Description",
        }),
      });
      const response = await app.fetch(req);
      assertEquals(response.status, 200);

      const result = await response.json();
      assertEquals(result.displayName, "Updated Name");
      assertEquals(result.description, "Updated Description");
    },
  );

  await t.step(
    "POST /rpc (action: delete) deletes a world",
    async () => {
      const world = "delete-world-" + ulid();
      await worlds.createWorld({
        id: world,
        displayName: "To Delete",
      });

      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          source: world,
        }),
      });
      const response = await app.fetch(req);
      assertEquals(response.status, 204);

      const getReq = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get",
          source: world,
        }),
      });
      const getResponse = await app.fetch(getReq);
      assertEquals(getResponse.status, 404);
    },
  );

  await t.step(
    "POST /rpc (action: get) returns 404 for non-existent world",
    async () => {
      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get",
          source: "non-existent-world",
        }),
      });
      const response = await app.fetch(req);
      assertEquals(response.status, 404);
    },
  );

  await t.step(
    "POST /rpc (action: unknown) returns 400",
    async () => {
      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "unknown",
        }),
      });
      const response = await app.fetch(req);
      assertEquals(response.status, 400);
    },
  );
});
