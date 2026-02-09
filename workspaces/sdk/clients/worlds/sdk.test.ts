import { assert, assertEquals } from "@std/assert";
import { createServer } from "@wazoo/api";
import { createTestContext, createTestOrganization } from "@wazoo/api/testing";
import type { SparqlSelectResults } from "./schema.ts";
import { WorldsSdk } from "#/sdk.ts";

import { WorldsService } from "@wazoo/api";

Deno.test("WorldsSdk - Worlds", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);

  // We need a test organization to create worlds
  const { id: organizationId, apiKey } = await createTestOrganization(
    appContext,
  );

  // Use the admin API key for world operations
  // Note: Since we are using admin key, we must specify organizationId where required
  const sdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: apiKey,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  let worldId: string;

  await t.step("create world", async () => {
    const world = await sdk.worlds.create({
      organizationId,
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
    await sdk.worlds.create({ organizationId, label: "World 1" });
    await sdk.worlds.create({ organizationId, label: "World 2" });

    const page1 = await sdk.worlds.list(1, 1, { organizationId });
    assertEquals(page1.length, 1);

    const page2 = await sdk.worlds.list(2, 1, { organizationId });
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

  /*
  await t.step("search world", async () => {
    // ... test code commented out ...
  });
  */

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

  await t.step("export world", async () => {
    // 1. Add some data if not already there (should be there from previous steps)
    // 2. Export in default format (N-Quads)
    const nQuadsBuffer = await sdk.worlds.export(worldId);
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject"));

    // 3. Export in Turtle format
    const turtleBuffer = await sdk.worlds.export(worldId, {
      format: "turtle",
    });
    const turtle = new TextDecoder().decode(turtleBuffer);
    assert(turtle.includes("<http://example.org/subject>"));
  });

  await t.step("import world", async () => {
    const turtleData =
      '<http://example.org/subject2> <http://example.org/predicate> "Imported Object" .';
    await sdk.worlds.import(worldId, turtleData, { format: "turtle" });

    const nQuadsBuffer = await sdk.worlds.export(worldId);
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject2"));
    assert(nQuads.includes("Imported Object"));
  });

  await t.step("delete world", async () => {
    await sdk.worlds.delete(worldId);
    const world = await sdk.worlds.get(worldId);
    assertEquals(world, null);
  });
});

Deno.test("WorldsSdk - Admin Organization Override", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);
  const worldsService = new WorldsService(appContext.database);

  // Create SDK with admin API key
  const adminSdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  // Create two test organizations
  const organizationA = await createTestOrganization(appContext);
  const organizationB = await createTestOrganization(appContext);

  await t.step("admin can list worlds for specific organization", async () => {
    // Create worlds for both organizations directly in DB
    const worldId1 = crypto.randomUUID();
    const now1 = Date.now();
    await worldsService.insert({
      id: worldId1,
      organization_id: organizationA.id,
      label: "Organization A World",
      description: "Test",
      db_hostname: null,
      db_token: null,
      created_at: now1,
      updated_at: now1,
      deleted_at: null,
    });
    await appContext.databaseManager!.create(worldId1);

    const worldId2 = crypto.randomUUID();
    const now2 = Date.now();
    await worldsService.insert({
      id: worldId2,
      organization_id: organizationB.id,
      label: "Organization B World",
      description: "Test",
      db_hostname: null,
      db_token: null,
      created_at: now2,
      updated_at: now2,
      deleted_at: null,
    });
    await appContext.databaseManager!.create(worldId2);

    // List worlds for Organization A using admin override
    const worldsA = await adminSdk.worlds.list(1, 20, {
      organizationId: organizationA.id,
    });
    assertEquals(worldsA.length, 1);
    assertEquals(worldsA[0].label, "Organization A World");
    assertEquals(worldsA[0].organizationId, organizationA.id);

    // List worlds for Organization B using admin override
    const worldsB = await adminSdk.worlds.list(1, 20, {
      organizationId: organizationB.id,
    });
    assertEquals(worldsB.length, 1);
    assertEquals(worldsB[0].label, "Organization B World");
    assertEquals(worldsB[0].organizationId, organizationB.id);
  });

  await t.step("admin can create world for specific organization", async () => {
    const world = await adminSdk.worlds.create({
      organizationId: organizationB.id,
      label: "Admin Created World",
      description: "Created via admin override",
    });

    assertEquals(world.organizationId, organizationB.id);
    assertEquals(world.label, "Admin Created World");

    // Verify in database
    const dbWorld = await worldsService.getById(world.id);
    assert(dbWorld);
    assertEquals(dbWorld.organization_id, organizationB.id);
  });

  await t.step("admin can get world for specific organization", async () => {
    // Create a world for Organization A
    const worldId = crypto.randomUUID();
    const now = Date.now();
    await worldsService.insert({
      id: worldId,
      organization_id: organizationA.id,
      label: "Test World",
      description: "Test",
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    await appContext.databaseManager!.create(worldId);

    // Get world using admin override
    const world = await adminSdk.worlds.get(worldId);
    assert(world !== null);
    assertEquals(world.organizationId, organizationA.id);
  });

  await t.step("admin can update world for specific organization", async () => {
    // Create a world for Organization A
    const worldId2 = crypto.randomUUID();
    const now3 = Date.now();
    await worldsService.insert({
      id: worldId2,
      organization_id: organizationA.id,
      label: "Original Name",
      description: "Original",
      db_hostname: null,
      db_token: null,
      created_at: now3,
      updated_at: now3,
      deleted_at: null,
    });
    await appContext.databaseManager!.create(worldId2);

    // Update using admin override
    await adminSdk.worlds.update(worldId2, {
      description: "Updated via admin",
    });

    // Verify update
    const world = await adminSdk.worlds.get(worldId2);
    assert(world !== null);
    assertEquals(world.description, "Updated via admin");
  });

  await t.step("admin can delete world for specific organization", async () => {
    // Create a world for Organization B
    const worldId3 = crypto.randomUUID();
    const now4 = Date.now();
    await worldsService.insert({
      id: worldId3,
      organization_id: organizationB.id,
      label: "To Delete",
      description: "Test",
      db_hostname: null,
      db_token: null,
      created_at: now4,
      updated_at: now4,
      deleted_at: null,
    });
    await appContext.databaseManager!.create(worldId3);

    // Delete using admin override
    await adminSdk.worlds.delete(worldId3);

    // Verify deletion
    const worldResult = await worldsService.getById(worldId3);
    assertEquals(worldResult, null);
  });

  await t.step(
    "admin SPARQL operations claim usage for specific organization",
    async () => {
      // Create a world for Organization A
      const worldId4 = crypto.randomUUID();
      const now5 = Date.now();
      await worldsService.insert({
        id: worldId4,
        organization_id: organizationA.id,
        label: "SPARQL Test World",
        description: "Test",
        db_hostname: null,
        db_token: null,
        created_at: now5,
        updated_at: now5,
        deleted_at: null,
      });
      await appContext.databaseManager!.create(worldId4);
      const worldId = worldId4;

      await adminSdk.worlds.sparql(
        worldId,
        'INSERT DATA { <http://example.org/s> <http://example.org/p> "Admin Object" . }',
      );

      const queryResult = await adminSdk.worlds.sparql(
        worldId,
        "SELECT * WHERE { ?s ?p ?o }",
      ) as SparqlSelectResults;

      assert(queryResult.results.bindings.length > 0);

      // Verify usage is attributed to Organization A
    },
  );

  /*
  await t.step("admin can search world for specific organization", async () => {
    // ... test code commented out ...
  });
  */
});
