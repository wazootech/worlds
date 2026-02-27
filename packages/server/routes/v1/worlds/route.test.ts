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

  await t.step(
    "GET /v1/worlds/:world/export - Content Negotiation (Turtle)",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);
      const worldId = ulid();
      const now = Date.now();
      await worldsService.insert({
        id: worldId,
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
        new Request(`http://localhost/v1/worlds/${worldId}/export`, {
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
    "GET /v1/worlds/:world returns 200 without Auth if no apiKey is set",
    async () => {
      const unprotectedContext = await createTestContext();
      unprotectedContext.apiKey = undefined;
      const unprotectedApp = createRoute(unprotectedContext);
      const worldId = ulid();
      const now = Date.now();
      const unprotectedWorldsService = new WorldsService(
        unprotectedContext.libsql.database,
      );
      await unprotectedWorldsService.insert({
        id: worldId,
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
        new Request(`http://localhost/v1/worlds/${worldId}`, {
          method: "GET",
        }),
      );

      assertEquals(resp.status, 200);
      const world = await resp.json();
      assertEquals(world.label, "Unprotected World");
    },
  );
});
