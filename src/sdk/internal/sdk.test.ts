import { assert, assertEquals } from "@std/assert";
import { createServer } from "#/server/server.ts";
import { createTestAccount, createTestContext } from "#/server/testing.ts";
import type { SparqlSelectResults } from "#/sdk/types.ts";
import { InternalWorldsSdk } from "./sdk.ts";

Deno.test("InternalWorldsSdk - Accounts", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);
  const sdk = new InternalWorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey, // Use admin API key for SDK
    fetch: (url, init) => server.fetch(new Request(url, init)),
  });

  await t.step("create account", async () => {
    const account = await sdk.accounts.create({
      id: "acc_sdk_test",
      description: "SDK Test Account",
      plan: "free",
    });
    assertEquals(account.id, "acc_sdk_test");
    assertEquals(account.description, "SDK Test Account");
    assertEquals(account.plan, "free");
  });

  await t.step("get account", async () => {
    const account = await sdk.accounts.get("acc_sdk_test");
    assert(account !== null);
    assertEquals(account.id, "acc_sdk_test");
    assertEquals(account.description, "SDK Test Account");

    const nonExistent = await sdk.accounts.get("non_existent");
    assertEquals(nonExistent, null);
  });

  await t.step("list accounts pagination", async () => {
    // Create more accounts for pagination
    await sdk.accounts.create({ id: "acc_page_1" });
    await sdk.accounts.create({ id: "acc_page_2" });

    const page1 = await sdk.accounts.list(1, 1);
    assertEquals(page1.length, 1);

    const page2 = await sdk.accounts.list(2, 1);
    assertEquals(page2.length, 1);
    assert(page1[0].id !== page2[0].id);

    // Clean up
    await sdk.accounts.delete("acc_page_1");
    await sdk.accounts.delete("acc_page_2");
  });

  await t.step("list accounts", async () => {
    const accounts = await sdk.accounts.list();
    assert(accounts.length >= 1);
    const found = accounts.find((a) => a.id === "acc_sdk_test");
    assert(found !== undefined);
  });

  await t.step("update account", async () => {
    await sdk.accounts.update("acc_sdk_test", {
      description: "Updated SDK Account",
    });
    const account = await sdk.accounts.get("acc_sdk_test");
    assert(account !== null);
    assertEquals(account.description, "Updated SDK Account");
  });

  await t.step("rotate account key", async () => {
    const original = await sdk.accounts.get("acc_sdk_test");
    await sdk.accounts.rotate("acc_sdk_test");
    const rotated = await sdk.accounts.get("acc_sdk_test");
    assert(original && rotated);
    assert(original.apiKey !== rotated.apiKey);
  });

  await t.step("delete account", async () => {
    await sdk.accounts.delete("acc_sdk_test");
    const account = await sdk.accounts.get("acc_sdk_test");
    assertEquals(account, null);
  });
});

Deno.test("InternalWorldsSdk - Worlds", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);

  // We need a test account to create worlds
  // We need a test account to create worlds
  const { apiKey } = await createTestAccount(appContext.libsqlClient);

  // Use the account's API key for world operations
  const sdk = new InternalWorldsSdk({
    baseUrl: "http://localhost",
    apiKey: apiKey,
    fetch: (url, init) => server.fetch(new Request(url, init)),
  });

  let worldId: string;

  await t.step("create world", async () => {
    const world = await sdk.worlds.create({
      label: "SDK World",
      description: "Test World",
      isPublic: false,
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

Deno.test("InternalWorldsSdk - Admin Account Override", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);

  // Create SDK with admin API key
  const adminSdk = new InternalWorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey,
    fetch: (url, init) => server.fetch(new Request(url, init)),
  });

  // Create two test accounts
  const accountA = await createTestAccount(appContext.libsqlClient);
  const accountB = await createTestAccount(appContext.libsqlClient);

  await t.step("admin can list worlds for specific account", async () => {
    // Create worlds for both accounts directly in DB
    const worldId1 = crypto.randomUUID();
    const now1 = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, account_id, label, description, created_at, updated_at, deleted_at, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        worldId1,
        accountA.id,
        "Account A World",
        "Test",
        now1,
        now1,
        null,
        0,
      ],
    });

    const worldId2 = crypto.randomUUID();
    const now2 = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, account_id, label, description, created_at, updated_at, deleted_at, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        worldId2,
        accountB.id,
        "Account B World",
        "Test",
        now2,
        now2,
        null,
        0,
      ],
    });

    // List worlds for Account A using admin override
    const worldsA = await adminSdk.worlds.list(1, 20, {
      accountId: accountA.id,
    });
    assertEquals(worldsA.length, 1);
    assertEquals(worldsA[0].label, "Account A World");
    assertEquals(worldsA[0].accountId, accountA.id);

    // List worlds for Account B using admin override
    const worldsB = await adminSdk.worlds.list(1, 20, {
      accountId: accountB.id,
    });
    assertEquals(worldsB.length, 1);
    assertEquals(worldsB[0].label, "Account B World");
    assertEquals(worldsB[0].accountId, accountB.id);
  });

  await t.step("admin can create world for specific account", async () => {
    const world = await adminSdk.worlds.create({
      label: "Admin Created World",
      description: "Created via admin override",
      isPublic: false,
    }, { accountId: accountB.id }); // This accountId takes precedence

    assertEquals(world.accountId, accountB.id);
    assertEquals(world.label, "Admin Created World");

    // Verify in database
    const dbWorldResult = await appContext.libsqlClient.execute({
      sql: "SELECT * FROM worlds WHERE id = ?",
      args: [world.id],
    });
    const dbWorld = dbWorldResult.rows[0];
    assert(dbWorld);
    assertEquals(dbWorld.account_id, accountB.id);
  });

  await t.step("admin can get world for specific account", async () => {
    // Create a world for Account A
    const worldId = crypto.randomUUID();
    const now = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, account_id, label, description, created_at, updated_at, deleted_at, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [worldId, accountA.id, "Test World", "Test", now, now, null, 0],
    });

    // Get world using admin override
    const world = await adminSdk.worlds.get(worldId, {
      accountId: accountA.id,
    });
    assert(world !== null);
    assertEquals(world.accountId, accountA.id);
  });

  await t.step("admin can update world for specific account", async () => {
    // Create a world for Account A
    const worldId2 = crypto.randomUUID();
    const now3 = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, account_id, label, description, created_at, updated_at, deleted_at, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        worldId2,
        accountA.id,
        "Original Name",
        "Original",
        now3,
        now3,
        null,
        0,
      ],
    });

    // Update using admin override
    await adminSdk.worlds.update(worldId2, {
      description: "Updated via admin",
    }, { accountId: accountA.id });

    // Verify update
    const world = await adminSdk.worlds.get(worldId2, {
      accountId: accountA.id,
    });
    assert(world !== null);
    assertEquals(world.description, "Updated via admin");
  });

  await t.step("admin can delete world for specific account", async () => {
    // Create a world for Account B
    const worldId3 = crypto.randomUUID();
    const now4 = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, account_id, label, description, created_at, updated_at, deleted_at, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [worldId3, accountB.id, "To Delete", "Test", now4, now4, null, 0],
    });

    // Delete using admin override
    await adminSdk.worlds.delete(worldId3, { accountId: accountB.id });

    // Verify deletion
    const worldResult = await appContext.libsqlClient.execute({
      sql: "SELECT * FROM worlds WHERE id = ?",
      args: [worldId3],
    });
    assertEquals(worldResult.rows.length, 0);
  });

  await t.step(
    "admin SPARQL operations claim usage for specific account",
    async () => {
      // Create a world for Account A
      const worldId4 = crypto.randomUUID();
      const now5 = Date.now();
      await appContext.libsqlClient.execute({
        sql:
          "INSERT INTO worlds (id, account_id, label, description, created_at, updated_at, deleted_at, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          worldId4,
          accountA.id,
          "SPARQL Test World",
          "Test",
          now5,
          now5,
          null,
          0,
        ],
      });
      const worldId = worldId4;

      // Perform SPARQL update using admin override
      await adminSdk.worlds.sparql(
        worldId,
        'INSERT DATA { <http://example.org/s> <http://example.org/p> "Admin Object" . }',
        { accountId: accountA.id },
      );

      // Perform SPARQL query using admin override
      const queryResult = await adminSdk.worlds.sparql(
        worldId,
        "SELECT * WHERE { ?s ?p ?o }",
        { accountId: accountA.id },
      ) as SparqlSelectResults;

      assert(queryResult.results.bindings.length > 0);

      // Verify usage is attributed to Account A
      // Note: Only SPARQL queries track usage, not updates
      // Usage verification removed as historical usage buckets are deprecated
    },
  );

  await t.step("admin can search world for specific account", async () => {
    // Create a world for Account A
    const worldId5 = crypto.randomUUID();
    const now6 = Date.now();
    await appContext.libsqlClient.execute({
      sql:
        "INSERT INTO worlds (id, account_id, label, description, created_at, updated_at, deleted_at, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        worldId5,
        accountA.id,
        "Search Test World",
        "Test",
        now6,
        now6,
        null,
        0,
      ],
    });

    // Search using admin override (won't return meaningful results without embeddings, but verifies no crash)
    const searchResults = await adminSdk.worlds.search("test query", {
      worldIds: [worldId5],
      accountId: accountA.id,
    });
    assert(Array.isArray(searchResults));
  });
});

Deno.test("InternalWorldsSdk - Invites", async (t) => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);
  const sdk = new InternalWorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey, // Use admin API key for SDK
    fetch: (url, init) => server.fetch(new Request(url, init)),
  });

  await t.step("create invite", async () => {
    const invite = await sdk.invites.create({ code: "sdk_invite_test" });
    assertEquals(invite.code, "sdk_invite_test");
    assertEquals(invite.redeemedBy, null);
    assertEquals(invite.redeemedAt, null);
  });

  await t.step("create invite with auto-generated code", async () => {
    const invite = await sdk.invites.create();
    assert(invite.code !== undefined);
    assert(invite.code.length > 0);
  });

  await t.step("get invite", async () => {
    const invite = await sdk.invites.get("sdk_invite_test");
    assert(invite !== null);
    assertEquals(invite.code, "sdk_invite_test");

    const nonExistent = await sdk.invites.get("non_existent_code");
    assertEquals(nonExistent, null);
  });

  await t.step("list invites pagination", async () => {
    await sdk.invites.create({ code: "invite_page_1" });
    await sdk.invites.create({ code: "invite_page_2" });

    const page1 = await sdk.invites.list(1, 1);
    assertEquals(page1.length, 1);

    const page2 = await sdk.invites.list(2, 1);
    assertEquals(page2.length, 1);
    assert(page1[0].code !== page2[0].code);

    // Clean up
    await sdk.invites.delete("invite_page_1");
    await sdk.invites.delete("invite_page_2");
  });

  await t.step("list invites", async () => {
    const invites = await sdk.invites.list();
    assert(invites.length >= 1);
    const found = invites.find((i) => i.code === "sdk_invite_test");
    assert(found !== undefined);
  });

  await t.step("redeem invite", async () => {
    // Create an account without a plan
    const account = await sdk.accounts.create({
      id: "acc_sdk_no_plan",
      description: "Account without plan",
    });
    assertEquals(account.plan, undefined);

    // Create user SDK with account's API key
    const userSdk = new InternalWorldsSdk({
      baseUrl: "http://localhost",
      apiKey: account.apiKey,
      fetch: (url, init) => server.fetch(new Request(url, init)),
    });

    // Create a fresh invite for redemption
    const invite = await sdk.invites.create({ code: "redeem_sdk_test" });
    assertEquals(invite.code, "redeem_sdk_test");

    // Redeem the invite (user must pass their own ID even with their API key)
    const result = await userSdk.invites.redeem(
      "redeem_sdk_test",
      "acc_sdk_no_plan",
    );
    assertEquals(result.plan, "free");

    // Verify account now has a plan
    const updatedAccount = await sdk.accounts.get("acc_sdk_no_plan");
    assert(updatedAccount !== null);
    assertEquals(updatedAccount.plan, "free");

    // Verify invite is marked as redeemed
    const redeemedInvite = await sdk.invites.get("redeem_sdk_test");
    assert(redeemedInvite !== null);
    assertEquals(redeemedInvite.redeemedBy, "acc_sdk_no_plan");
    assert(redeemedInvite.redeemedAt !== null);
  });

  await t.step("delete invite", async () => {
    await sdk.invites.delete("sdk_invite_test");
    const invite = await sdk.invites.get("sdk_invite_test");
    assertEquals(invite, null);
  });
});
