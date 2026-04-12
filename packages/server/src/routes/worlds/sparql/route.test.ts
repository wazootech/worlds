import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestNamespace,
  LocalWorlds,
  WORLDS_WORLD_NAMESPACE,
  WorldsRepository,
} from "@wazoo/worlds-sdk";
import createRoute from "./route.ts";

Deno.test("SPARQL API routes", async (t) => {
  await using testContext = await createTestContext();
  await using worlds = new LocalWorlds(testContext);
  testContext.engine = worlds;
  await worlds.init();
  const app = createRoute(testContext);
  const worldsRepository = new WorldsRepository(testContext.libsql.database);

  await t.step(
    "POST /worlds/:slug/sparql (Admin)",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const slug = "sparql-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace_id: WORLDS_WORLD_NAMESPACE,
        slug,
        label: "SPARQL World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create({
        namespace: WORLDS_WORLD_NAMESPACE,
        slug,
      });

      const resp = await app.fetch(
        new Request(`http://localhost/worlds/${slug}/sparql`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: "SELECT * WHERE { ?s ?p ?o } LIMIT 1",
          }),
        }),
      );

      assertEquals(resp.status, 200);
    },
  );

  await t.step(
    "POST /worlds/:slug/sparql - Service Description",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const slug = "sd-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace_id: WORLDS_WORLD_NAMESPACE,
        slug,
        label: "SD World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create({
        namespace: WORLDS_WORLD_NAMESPACE,
        slug,
      });

      const resp = await app.fetch(
        new Request(`http://localhost/worlds/${slug}/sparql`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "text/turtle",
          },
          body: JSON.stringify({}),
        }),
      );

      assertEquals(resp.status, 200);
      assertEquals(resp.headers.get("Content-Type"), "text/turtle");

      const body = await resp.text();
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
    "POST /worlds/:slug/sparql - Service Description (N-Triples)",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const slug = "nt-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace_id: WORLDS_WORLD_NAMESPACE,
        slug,
        label: "NT World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create({
        namespace: WORLDS_WORLD_NAMESPACE,
        slug,
      });

      const resp = await app.fetch(
        new Request(`http://localhost/worlds/${slug}/sparql`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/n-triples",
          },
          body: JSON.stringify({}),
        }),
      );

      assertEquals(resp.status, 200);
      assertEquals(resp.headers.get("Content-Type"), "application/n-triples");

      const body = await resp.text();
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
    "POST /worlds/:slug/sparql - Weighted Content Negotiation",
    async () => {
      const { apiKey } = await createTestNamespace(
        testContext,
      );
      const slug = "post-sd-world-" + ulid();
      const now = Date.now();
      await worldsRepository.insert({
        namespace_id: WORLDS_WORLD_NAMESPACE,
        slug,
        label: "Weighted World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create({
        namespace: WORLDS_WORLD_NAMESPACE,
        slug,
      });

      const resp = await app.fetch(
        new Request(`http://localhost/worlds/${slug}/sparql`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/n-triples;q=1.0, text/turtle;q=0.5",
          },
          body: JSON.stringify({}),
        }),
      );

      assertEquals(resp.status, 200);
      assertEquals(resp.headers.get("Content-Type"), "application/n-triples");
    },
  );
});
