import { assert, assertEquals } from "@std/assert";
import { createTestAccount, createTestContext } from "#/server/testing.ts";
import createRoute from "./route.ts";

Deno.test("Worlds API routes - GET operations", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const app = createRoute(testContext);

  await t.step("GET /v1/worlds/:world returns world metadata", async () => {
    const { id: accountId, apiKey } = await createTestAccount(db);
    const result = await db.worlds.add({
      accountId,
      name: "Test World",
      description: "Test Description",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    });
    assert(result.ok);
    const worldId = result.id;

    const resp = await app.fetch(
      new Request(`http://localhost/v1/worlds/${worldId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }),
    );

    assertEquals(resp.status, 200);
    assertEquals(resp.headers.get("content-type"), "application/json");

    const world = await resp.json();
    assertEquals(world.accountId, accountId);
    assertEquals(world.name, "Test World");
    assert(typeof world.createdAt === "number");
    assert(typeof world.updatedAt === "number");
    assertEquals(world.deletedAt, null);
    assertEquals(world.isPublic, false);
  });

  await t.step(
    "GET /v1/worlds/:world returns 404 for non-existent world",
    async () => {
      const { apiKey } = await createTestAccount(db);

      const resp = await app.fetch(
        new Request("http://localhost/v1/worlds/non-existent-world", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 404);
    },
  );

  await t.step(
    "GET /v1/worlds/:world returns 404 for deleted world",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      // Mark world as deleted
      await db.worlds.update(worldId, { deletedAt: Date.now() });

      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 404);
    },
  );

  testContext.kv.close();
});

Deno.test("Worlds API routes - PUT operations", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const app = createRoute(testContext);

  await t.step(
    "PUT /v1/worlds/:world updates world description",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      // Update description
      const updateResp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ description: "Updated description" }),
        }),
      );
      assertEquals(updateResp.status, 204);

      // Verify update
      const getResp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );
      assertEquals(getResp.status, 200);
      const world = await getResp.json();
      assertEquals(world.description, "Updated description");
    },
  );

  await t.step(
    "PUT /v1/worlds/:world returns 400 for invalid JSON",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);
      const result = await db.worlds.add({
        accountId,
        name: "Test World",
        description: "Test Description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result.ok);
      const worldId = result.id;

      const invalidJsonResp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: "invalid-json",
        }),
      );
      assertEquals(invalidJsonResp.status, 400);
    },
  );

  await t.step(
    "PUT /v1/worlds/:world returns 404 for non-existent world",
    async () => {
      const { apiKey } = await createTestAccount(db);

      const updateResp = await app.fetch(
        new Request("http://localhost/v1/worlds/non-existent-world", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ description: "Test" }),
        }),
      );
      assertEquals(updateResp.status, 404);
    },
  );

  testContext.kv.close();
});

Deno.test("Worlds API routes - DELETE operations", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const app = createRoute(testContext);

  await t.step("DELETE /v1/worlds/:world deletes a world", async () => {
    const { id: accountId, apiKey } = await createTestAccount(db);
    const result = await db.worlds.add({
      accountId,
      name: "Test World",
      description: "Test Description",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    });
    assert(result.ok);
    const worldId = result.id;
    // Create a dummy blob to verify deletion
    await db.worldBlobs.set(worldId, new Uint8Array([1, 2, 3]));

    // Delete world
    const deleteResp = await app.fetch(
      new Request(`http://localhost/v1/worlds/${worldId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }),
    );
    if (deleteResp.status !== 204) {
      console.log(await deleteResp.text());
    }
    assertEquals(deleteResp.status, 204);

    // Verify deletion - should return 404
    const getResp = await app.fetch(
      new Request(`http://localhost/v1/worlds/${worldId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }),
    );
    assertEquals(getResp.status, 404);

    // Verify blob deletion
    const blobResult = await db.worldBlobs.find(worldId);
    assertEquals(blobResult, null);
  });

  await t.step(
    "DELETE /v1/worlds/:world returns 404 for non-existent world",
    async () => {
      const { apiKey } = await createTestAccount(db);

      const deleteResp = await app.fetch(
        new Request("http://localhost/v1/worlds/non-existent-world", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );
      assertEquals(deleteResp.status, 404);
    },
  );

  testContext.kv.close();
});

Deno.test("Worlds API routes - List operations", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const app = createRoute(testContext);

  await t.step(
    "GET /v1/worlds returns paginated list of worlds for account",
    async () => {
      const { id: accountId, apiKey } = await createTestAccount(db);

      const result1 = await db.worlds.add({
        accountId,
        name: "Test World 1",
        description: "Test Description 1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result1.ok);

      const result2 = await db.worlds.add({
        accountId,
        name: "Test World 2",
        description: "Test Description 2",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });
      assert(result2.ok);

      const resp = await app.fetch(
        new Request("http://localhost/v1/worlds?page=1&pageSize=20", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 200);
      const worlds = await resp.json();
      assert(Array.isArray(worlds));
      assert(worlds.length >= 2);

      // Verify worlds belong to test account
      // Note: we can't search by worldId directly in the name since names are "Test World 1", but IDs are UUIDs.
      // The original test checked names.
      const worldNames = worlds.map((w: { name: string }) => w.name);
      assert(worldNames.includes("Test World 1"));
      assert(worldNames.includes("Test World 2"));
    },
  );

  await t.step(
    "GET /v1/worlds returns 401 for unauthenticated request",
    async () => {
      const resp = await app.fetch(
        new Request("http://localhost/v1/worlds", {
          method: "GET",
        }),
      );

      assertEquals(resp.status, 401);
    },
  );

  testContext.kv.close();
});
