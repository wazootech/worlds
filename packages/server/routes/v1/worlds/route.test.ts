import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import createRoute from "./route.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";

Deno.test("Worlds API routes", async (t) => {
  const testContext = await createTestContext();
  const worldsService = new WorldsService(testContext.libsql.database);
  const app = createRoute(testContext);

  await t.step(
    "GET /v1/worlds/:world returns world metadata (Admin)",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);
      const worldId = ulid();
      const now = Date.now();
      await worldsService.insert({
        id: worldId,
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
        new Request(`http://localhost/v1/worlds/${worldId}`, {
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

  await t.step(
    "GET /v1/worlds/:world returns world metadata by slug",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);
      const worldId = ulid();
      const slug = "test-world-slug-" + worldId;
      const now = Date.now();
      await worldsService.insert({
        id: worldId,
        slug: slug,
        label: "Slug World",
        description: "Test Description",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      const resp = await app.fetch(
        new Request(
          `http://localhost/v1/worlds/${slug}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            },
          },
        ),
      );

      assertEquals(resp.status, 200);
      const world = await resp.json();
      assertEquals(world.id, worldId);
      assertEquals(world.slug, slug);
    },
  );

  await t.step("POST /v1/worlds creates a new world (Admin Only)", async () => {
    const { apiKey } = await createTestOrganization(testContext);

    const slug = ("new-world-" + ulid()).toLowerCase();
    const req = new Request("http://localhost/v1/worlds", {
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
    assertEquals(world.organizationId, null);
  });
});
