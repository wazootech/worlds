import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import createRoute from "./route.ts";

Deno.test("SPARQL API routes", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);
  const worldsService = new WorldsService(testContext.libsql.database);

  await t.step(
    "GET /v1/worlds/:world/sparql (Admin)",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);
      const worldId = ulid();
      const now = Date.now();
      await worldsService.insert({
        id: worldId,
        slug: "sparql-world-" + worldId,
        label: "SPARQL World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      const resp = await app.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/sparql`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }),
      );

      assertEquals(resp.status, 200);
    },
  );
});
