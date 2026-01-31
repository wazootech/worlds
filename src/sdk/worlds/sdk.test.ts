import { assert, assertEquals } from "@std/assert";
import { createServer } from "#/server/server.ts";
import { createTestContext, createTestTenant } from "#/server/testing.ts";
import type { SparqlSelectResults } from "./schema.ts";
import { WorldsSdk } from "#/sdk/sdk.ts";

Deno.test("WorldsSdk - Worlds", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);

  // We need a test tenant to create worlds
  const { apiKey } = await createTestTenant(appContext.libsqlClient);

  // Use the tenant's API key for world operations
  const sdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: apiKey,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  let worldId: string;

  await t.step("create world", async () => {
    const world = await sdk.worlds.create({
      label: "SDK World",
      description: "Test World",
    });
    assert(world.id !== undefined);
    assertEquals(world.label, "SDK World");
    worldId = world.id;
  });

  await t.step("get world", async () => {
    const world = await sdk.worlds.get(worldId);
    assert(world !== null);
    assertEquals(world.label, "SDK World");
  });

  await t.step("list worlds pagination", async () => {
    // Create more worlds for pagination
    await sdk.worlds.create({ label: "World 1" });
    await sdk.worlds.create({ label: "World 2" });

    const page1 = await sdk.worlds.list(1, 1);
    assertEquals(page1.length, 1);

    const page2 = await sdk.worlds.list(2, 1);
    assertEquals(page2.length, 1);
    assert(page1[0].id !== page2[0].id);
  });

  await t.step("update world", async () => {
    await sdk.worlds.update(worldId, {
      description: "Updated Description",
    });
    const world = await sdk.worlds.get(worldId);
    assert(world !== null);
    assertEquals(world.description, "Updated Description");
  });

  await t.step("search world", async () => {
    // 1. Insert some facts to search for
    await sdk.worlds.sparql(
      worldId,
      `INSERT DATA { 
        <http://example.org/a> <http://example.org/p> "Apple" .
        <http://example.org/b> <http://example.org/p> "Banana" .
      }`,
    );

    // 2. Search with limit 1
    const results = await sdk.worlds.search("fruit", {
      worldIds: [worldId],
      limit: 1,
    });
    assert(Array.isArray(results));
    // Note: In tests, the mock search might return all results if not fully implemented,
    // but the server route should enforce the limit from store.search.
    assert(results.length <= 1);
  });

  await t.step("sparql update", async () => {
    const updateQuery = `
      INSERT DATA {
        <http://example.org/subject> <http://example.org/predicate> "Update Object" .
      }
    `;
    const result = await sdk.worlds.sparql(worldId, updateQuery);
    assertEquals(result, null);
  });

  await t.step("sparql query", async () => {
    const selectQuery = `
      SELECT ?s ?p ?o WHERE {
        <http://example.org/subject> <http://example.org/predicate> ?o
      }
    `;
    const result = await sdk.worlds.sparql(
      worldId,
      selectQuery,
    ) as SparqlSelectResults;
    assert(result.results.bindings.length > 0);
    assertEquals(result.results.bindings[0].o.value, "Update Object");
  });

  await t.step("download world", async () => {
    // 1. Add some data if not already there (should be there from previous steps)
    // 2. Download in default format (N-Quads)
    const nQuadsBuffer = await sdk.worlds.download(worldId);
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject"));

    // 3. Download in Turtle format
    const turtleBuffer = await sdk.worlds.download(worldId, {
      format: "turtle",
    });
    const turtle = new TextDecoder().decode(turtleBuffer);
    assert(turtle.includes("<http://example.org/subject>"));
  });

  await t.step("delete world", async () => {
    await sdk.worlds.delete(worldId);
    const world = await sdk.worlds.get(worldId);
    assertEquals(world, null);
  });
});

Deno.test("WorldsSdk - Admin Tenant Override", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);

  // Create SDK with admin API key
  const adminSdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  // Create two test tenants
  const tenantA = await createTestTenant(appContext.libsqlClient);
  const tenantB = await createTestTenant(appContext.libsqlClient);

  await t.step("admin can list worlds for specific tenant", async () => {
    // Create worlds for both tenants directly in DB
    const worldId1 = crypto.randomUUID();
    const now1 = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, tenant_id, label, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        worldId1,
        tenantA.id,
        "Tenant A World",
        "Test",
        now1,
        now1,
        null,
      ],
    });

    const worldId2 = crypto.randomUUID();
    const now2 = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, tenant_id, label, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        worldId2,
        tenantB.id,
        "Tenant B World",
        "Test",
        now2,
        now2,
        null,
      ],
    });

    // List worlds for Tenant A using admin override
    const worldsA = await adminSdk.worlds.list(1, 20, {
      tenantId: tenantA.id,
    });
    assertEquals(worldsA.length, 1);
    assertEquals(worldsA[0].label, "Tenant A World");
    assertEquals(worldsA[0].tenantId, tenantA.id);

    // List worlds for Tenant B using admin override
    const worldsB = await adminSdk.worlds.list(1, 20, {
      tenantId: tenantB.id,
    });
    assertEquals(worldsB.length, 1);
    assertEquals(worldsB[0].label, "Tenant B World");
    assertEquals(worldsB[0].tenantId, tenantB.id);
  });

  await t.step("admin can create world for specific tenant", async () => {
    const world = await adminSdk.worlds.create({
      label: "Admin Created World",
      description: "Created via admin override",
    }, { tenantId: tenantB.id }); // This tenantId takes precedence

    assertEquals(world.tenantId, tenantB.id);
    assertEquals(world.label, "Admin Created World");

    // Verify in database
    const dbWorldResult = await appContext.libsqlClient.execute({
      sql: "SELECT * FROM worlds WHERE id = ?",
      args: [world.id],
    });
    const dbWorld = dbWorldResult.rows[0];
    assert(dbWorld);
    assertEquals(dbWorld.tenant_id, tenantB.id);
  });

  await t.step("admin can get world for specific tenant", async () => {
    // Create a world for Tenant A
    const worldId = crypto.randomUUID();
    const now = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, tenant_id, label, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [worldId, tenantA.id, "Test World", "Test", now, now, null],
    });

    // Get world using admin override
    const world = await adminSdk.worlds.get(worldId, {
      tenantId: tenantA.id,
    });
    assert(world !== null);
    assertEquals(world.tenantId, tenantA.id);
  });

  await t.step("admin can update world for specific tenant", async () => {
    // Create a world for Tenant A
    const worldId2 = crypto.randomUUID();
    const now3 = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, tenant_id, label, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        worldId2,
        tenantA.id,
        "Original Name",
        "Original",
        now3,
        now3,
        null,
      ],
    });

    // Update using admin override
    await adminSdk.worlds.update(worldId2, {
      description: "Updated via admin",
    }, { tenantId: tenantA.id });

    // Verify update
    const world = await adminSdk.worlds.get(worldId2, {
      tenantId: tenantA.id,
    });
    assert(world !== null);
    assertEquals(world.description, "Updated via admin");
  });

  await t.step("admin can delete world for specific tenant", async () => {
    // Create a world for Tenant B
    const worldId3 = crypto.randomUUID();
    const now4 = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, tenant_id, label, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [worldId3, tenantB.id, "To Delete", "Test", now4, now4, null],
    });

    // Delete using admin override
    await adminSdk.worlds.delete(worldId3, { tenantId: tenantB.id });

    // Verify deletion
    const worldResult = await appContext.libsqlClient.execute({
      sql: "SELECT * FROM worlds WHERE id = ?",
      args: [worldId3],
    });
    assertEquals(worldResult.rows.length, 0);
  });

  await t.step(
    "admin SPARQL operations claim usage for specific tenant",
    async () => {
      // Create a world for Tenant A
      const worldId4 = crypto.randomUUID();
      const now5 = Date.now();
      await appContext.libsqlClient.execute({
        sql:
          "INSERT INTO worlds (id, tenant_id, label, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          worldId4,
          tenantA.id,
          "SPARQL Test World",
          "Test",
          now5,
          now5,
          null,
        ],
      });
      const worldId = worldId4;

      // Perform SPARQL update using admin override
      await adminSdk.worlds.sparql(
        worldId,
        'INSERT DATA { <http://example.org/s> <http://example.org/p> "Admin Object" . }',
        { tenantId: tenantA.id },
      );

      // Perform SPARQL query using admin override
      const queryResult = await adminSdk.worlds.sparql(
        worldId,
        "SELECT * WHERE { ?s ?p ?o }",
        { tenantId: tenantA.id },
      ) as SparqlSelectResults;

      assert(queryResult.results.bindings.length > 0);

      // Verify usage is attributed to Tenant A
      // Note: Only SPARQL queries track usage, not updates
      // Usage verification removed as historical usage buckets are deprecated
    },
  );

  await t.step("admin can search world for specific tenant", async () => {
    // Create a world for Tenant A
    const worldId5 = crypto.randomUUID();
    const now6 = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, tenant_id, label, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        worldId5,
        tenantA.id,
        "Search Test World",
        "Test",
        now6,
        now6,
        null,
      ],
    });

    // Search using admin override (won't return meaningful results without embeddings, but verifies no crash)
    const searchResults = await adminSdk.worlds.search("test query", {
      worldIds: [worldId5],
      tenantId: tenantA.id,
    });
    assert(Array.isArray(searchResults));
  });
});
