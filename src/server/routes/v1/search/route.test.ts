import { assertEquals } from "@std/assert";
import { DataFactory } from "n3";
import route from "./route.ts";
import { createClient } from "@libsql/client";
import { LibsqlSearchStoreManager } from "#/server/search/libsql.ts";
import { initializeDatabase } from "#/server/db/init.ts";
import { worldsAdd } from "#/server/db/queries/worlds.sql.ts";
import { createTestTenant } from "#/server/testing.ts";

Deno.test("Search API - Top-Level Route", async (t) => {
  const client = createClient({ url: ":memory:" });
  await initializeDatabase(client);

  const embedder = {
    embed: (_: string) => Promise.resolve(new Array(768).fill(0)),
    dimensions: 768,
  };
  const appContext = { libsqlClient: client, embeddings: embedder };
  const adminHandler = route({ ...appContext, admin: { apiKey: "admin-key" } });

  const { id: tenantId } = await createTestTenant(client);

  // Create two worlds
  const worldId1 = crypto.randomUUID();
  const worldId2 = crypto.randomUUID();
  const now = Date.now();

  await client.execute({
    sql: worldsAdd,
    args: [worldId1, tenantId, "World 1", null, null, now, now, null, 0],
  });
  await client.execute({
    sql: worldsAdd,
    args: [worldId2, tenantId, "World 2", null, null, now, now, null, 0],
  });

  // Sync to search store using LibsqlSearchStore
  const searchStore = new LibsqlSearchStoreManager({
    client,
    embeddings: embedder,
  });
  await searchStore.createTablesIfNotExists();

  const testQuad1 = DataFactory.quad(
    DataFactory.namedNode("http://example.org/s1"),
    DataFactory.namedNode("http://example.org/p1"),
    DataFactory.literal("Hello Earth"),
  );
  const testQuad2 = DataFactory.quad(
    DataFactory.namedNode("http://example.org/s2"),
    DataFactory.namedNode("http://example.org/p2"),
    DataFactory.literal("Hello Mars"),
  );

  await searchStore.patch(tenantId, worldId1, [{
    deletions: [],
    insertions: [testQuad1],
  }]);
  await searchStore.patch(tenantId, worldId2, [{
    deletions: [],
    insertions: [testQuad2],
  }]);

  await t.step("GET /v1/search requires query", async () => {
    const resp = await adminHandler.fetch(
      new Request("http://localhost/v1/search", {
        headers: { "Authorization": "Bearer admin-key" },
      }),
    );
    assertEquals(resp.status, 400);
  });

  await t.step("GET /v1/search across all worlds of account", async () => {
    const resp = await adminHandler.fetch(
      new Request(`http://localhost/v1/search?q=Hello&tenant=${tenantId}`, {
        headers: { "Authorization": "Bearer admin-key" },
      }),
    );
    assertEquals(resp.status, 200);
    const body = await resp.json();
    assertEquals(Array.isArray(body), true);
    assertEquals(body.length, 2);
  });

  await t.step("GET /v1/search filtered by specific worlds", async () => {
    const resp = await adminHandler.fetch(
      new Request(
        `http://localhost/v1/search?q=Hello&worlds=${worldId1}&tenant=${tenantId}`,
        {
          headers: { "Authorization": "Bearer admin-key" },
        },
      ),
    );
    assertEquals(resp.status, 200);
    const body = await resp.json();
    assertEquals(body.length, 1);
    assertEquals(body[0].value.worldId, worldId1);
  });

  await t.step("GET /v1/search validates world access", async () => {
    const resp = await adminHandler.fetch(
      new Request(
        `http://localhost/v1/search?q=Hello&worlds=other-world&tenant=${tenantId}`,
        {
          headers: { "Authorization": "Bearer admin-key" },
        },
      ),
    );
    assertEquals(resp.status, 404); // "No valid worlds found"
  });
});
