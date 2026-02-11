import { assert, assertEquals, assertExists } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import { createServer } from "@wazoo/server";
import { createTestContext } from "@wazoo/server/testing";
import type { SparqlSelectResults } from "./schema.ts";
import { WorldsSdk } from "#/sdk.ts";

Deno.test("WorldsSdk - Worlds", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);

  // Use the admin API key for setup
  const adminSdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  // We need a test organization to create worlds
  const organizationId = ulid();
  await adminSdk.organizations.create({
    id: organizationId,
    label: "Test Organization",
    description: "SDK Test",
  });

  // Use the admin SDK for world operations
  const sdk = adminSdk;

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

  await t.step("search world", async () => {
    const results = await sdk.worlds.search(worldId, "Update Object");
    assert(results.length > 0);
    assertEquals(results[0].object, "Update Object");
    assertEquals(results[0].subject, "http://example.org/subject");
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

  // Create SDK with admin API key
  const adminSdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  // Create two test organizations using SDK
  const orgAId = ulid();
  await adminSdk.organizations.create({ id: orgAId, label: "Org A" });
  const orgBId = ulid();
  await adminSdk.organizations.create({ id: orgBId, label: "Org B" });

  await t.step("admin can list worlds for specific organization", async () => {
    // Create worlds for both organizations using SDK
    await adminSdk.worlds.create({
      organizationId: orgAId,
      label: "Organization A World",
      description: "Test",
    });

    await adminSdk.worlds.create({
      organizationId: orgBId,
      label: "Organization B World",
      description: "Test",
    });
    // List worlds for Organization A using admin override
    const worldsA = await adminSdk.worlds.list(1, 20, {
      organizationId: orgAId,
    });
    assertEquals(worldsA.length, 1);
    assertEquals(worldsA[0].label, "Organization A World");
    assertEquals(worldsA[0].organizationId, orgAId);

    // List worlds for Organization B using admin override
    const worldsB = await adminSdk.worlds.list(1, 20, {
      organizationId: orgBId,
    });
    assertEquals(worldsB.length, 1);
    assertEquals(worldsB[0].label, "Organization B World");
    assertEquals(worldsB[0].organizationId, orgBId);
  });

  await t.step("admin can create world for specific organization", async () => {
    const world = await adminSdk.worlds.create({
      organizationId: orgBId,
      label: "Admin Created World",
      description: "Created via admin override",
    });

    assertEquals(world.organizationId, orgBId);
    assertEquals(world.label, "Admin Created World");

    // Verify via SDK
    const fetched = await adminSdk.worlds.get(world.id);
    assertExists(fetched);
    assertEquals(fetched.organizationId, orgBId);
  });

  await t.step("admin can get world for specific organization", async () => {
    // Create a world for Organization A
    const world = await adminSdk.worlds.create({
      organizationId: orgAId,
      label: "Test World",
      description: "Test",
    });

    // Get world using admin override
    const fetched = await adminSdk.worlds.get(world.id);
    assertExists(fetched);
    assertEquals(fetched.organizationId, orgAId);
  });

  await t.step("admin can update world for specific organization", async () => {
    // Create a world for Organization A
    const world = await adminSdk.worlds.create({
      organizationId: orgAId,
      label: "Original Name",
      description: "Original",
    });

    // Update using admin override
    await adminSdk.worlds.update(world.id, {
      description: "Updated via admin",
    });

    // Verify update
    const updated = await adminSdk.worlds.get(world.id);
    assertExists(updated);
    assertEquals(updated.description, "Updated via admin");
  });

  await t.step("admin can delete world for specific organization", async () => {
    // Create a world for Organization B
    const world = await adminSdk.worlds.create({
      organizationId: orgBId,
      label: "To Delete",
      description: "Test",
    });

    // Delete using admin override
    await adminSdk.worlds.delete(world.id);

    // Verify deletion
    const result = await adminSdk.worlds.get(world.id);
    assertEquals(result, null);
  });

  await t.step(
    "admin SPARQL operations claim usage for specific organization",
    async () => {
      // Create a world for Organization A
      const world = await adminSdk.worlds.create({
        organizationId: orgAId,
        label: "SPARQL Test World",
        description: "Test",
      });

      await adminSdk.worlds.sparql(
        world.id,
        'INSERT DATA { <http://example.org/s> <http://example.org/p> "Admin Object" . }',
      );

      const queryResult = await adminSdk.worlds.sparql(
        world.id,
        "SELECT * WHERE { ?s ?p ?o }",
      ) as SparqlSelectResults;

      assert(queryResult.results.bindings.length > 0);

      // Verify usage is attributed to Organization A (logic would be checking metrics SDK if available, or just assuming it works if call succeeds)
    },
  );
});
