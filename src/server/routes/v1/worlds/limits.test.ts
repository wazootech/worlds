import { assert, assertEquals } from "@std/assert";
import { createTestAccount, createTestContext } from "#/server/testing.ts";
import createWorldsRoute from "./route.ts";
import createSparqlRoute from "./sparql/route.ts";

Deno.test("World Limits - World Count", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const worldsApp = createWorldsRoute(testContext);

  await t.step("rejects world creation when limit is reached", async () => {
    // Create account with 'test' plan (limit: 2 worlds)
    const { id: accountId, apiKey } = await createTestAccount(db, {
      plan: "test",
    });

    // Create 1st world
    let resp = await worldsApp.fetch(
      new Request("http://localhost/v1/worlds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ label: "World 1" }),
      }),
    );
    assertEquals(resp.status, 201);

    // Create 2nd world
    resp = await worldsApp.fetch(
      new Request("http://localhost/v1/worlds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ label: "World 2" }),
      }),
    );
    assertEquals(resp.status, 201);

    // Attempt 3rd world (should fail)
    resp = await worldsApp.fetch(
      new Request("http://localhost/v1/worlds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ label: "World 3" }),
      }),
    );
    assertEquals(resp.status, 403);
    assertEquals(await resp.text(), "World limit reached");
  });

  testContext.kv.close();
});

Deno.test("World Limits - World Size", async (t) => {
  const testContext = await createTestContext();
  const { db } = testContext;
  const sparqlApp = createSparqlRoute(testContext);
  const worldsApp = createWorldsRoute(testContext);

  await t.step(
    "rejects sparql update when blob size exceeds limit",
    async () => {
      // Create account with 'test' plan (limit: 100 bytes)
      const { id: accountId, apiKey } = await createTestAccount(db, {
        plan: "test",
      });

      // Create a world
      const createResp = await worldsApp.fetch(
        new Request("http://localhost/v1/worlds", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ label: "Size Test World" }),
        }),
      );
      const world = await createResp.json();
      const worldId = world.id;

      // Small update (should succeed)
      const smallUpdate =
        `INSERT DATA { <http://example.org/s> <http://example.org/p> "small" }`;
      let resp = await sparqlApp.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/sparql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/sparql-update",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: smallUpdate,
        }),
      );
      assertEquals(resp.status, 204);

      // Large update (should fail - test limit is 100 bytes)
      const largeData = "x".repeat(200);
      const largeUpdate =
        `INSERT DATA { <http://example.org/s> <http://example.org/p> "${largeData}" }`;
      resp = await sparqlApp.fetch(
        new Request(`http://localhost/v1/worlds/${worldId}/sparql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/sparql-update",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: largeUpdate,
        }),
      );
      assertEquals(resp.status, 413);
      assertEquals(await resp.text(), "World size limit exceeded");
    },
  );

  testContext.kv.close();
});
