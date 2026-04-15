import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestNamespace,
  LocalWorlds,
  WorldsRepository,
} from "@wazoo/worlds-sdk";

Deno.test("SPARQL API routes", async (t) => {
  await using testContext = await createTestContext();
  await using worlds = new LocalWorlds(testContext);
  testContext.engine = worlds;
  await worlds.init();
  const { createServer } = await import("../../../server.ts");
  const app = await createServer(testContext);
  const worldsRepository = new WorldsRepository(testContext.libsql.database);

  await t.step(
    "POST /worlds-sparql (Admin)",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const world = "sparql-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace: "_",
        world,
        label: "SPARQL World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create({
        namespace: "_",
        world,
      });

      const response = await app.fetch(
        new Request(`http://localhost/worlds/rpc/sparql`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sources: [world],
            query: "SELECT * WHERE { ?s ?p ?o } LIMIT 1",
          }),
        }),
      );

      assertEquals(response.status, 200);
    },
  );

  await t.step(
    "POST /worlds:sparql - Service Description",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const world = "sd-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace: "_",
        world,
        label: "SD World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create({
        namespace: "_",
        world,
      });

      const response = await app.fetch(
        new Request(`http://localhost/worlds/rpc/sparql`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "text/turtle",
          },
          body: JSON.stringify({
            sources: [world],
          }),
        }),
      );

      assertEquals(response.status, 200);
      assertEquals(response.headers.get("Content-Type"), "text/turtle");

      const body = await response.text();
      assert(
        body.includes(
          "http://www.w3.org/ns/sparql-service-description#Service",
        ),
      );
      assert(
        body.includes(
          "http://www.w3.org/ns/sparql-service-description#endpoint",
        ),
      );
      assert(body.includes("SPARQL11Query"));
      assert(body.includes("SPARQL12Query"));
      assert(body.includes("DereferencesURIs"));
      assert(body.includes("TripleTerms"));
    },
  );

  await t.step(
    "POST /worlds:sparql - Service Description (N-Triples)",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const world = "nt-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace: "_",
        world,
        label: "NT World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create({
        namespace: "_",
        world,
      });

      const response = await app.fetch(
        new Request(`http://localhost/worlds/rpc/sparql`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/n-triples",
          },
          body: JSON.stringify({
            sources: [world],
          }),
        }),
      );

      assertEquals(response.status, 200);
      assertEquals(
        response.headers.get("Content-Type"),
        "application/n-triples",
      );

      const body = await response.text();
      assert(
        body.includes(
          "<http://www.w3.org/ns/sparql-service-description#Service>",
        ),
      );
      assert(
        body.includes(
          "<http://www.w3.org/ns/sparql-service-description#endpoint>",
        ),
      );
    },
  );

  await t.step(
    "POST /worlds:sparql - Weighted Content Negotiation",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const world = "post-sd-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace: "_",
        world,
        label: "Weighted World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create({
        namespace: "_",
        world,
      });

      const response = await app.fetch(
        new Request(`http://localhost/worlds/rpc/sparql`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/n-triples;q=1.0, text/turtle;q=0.5",
          },
          body: JSON.stringify({
            sources: [world],
          }),
        }),
      );

      assertEquals(response.status, 200);
      assertEquals(
        response.headers.get("Content-Type"),
        "application/n-triples",
      );
    },
  );
});
