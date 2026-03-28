import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import { WorldsRepository } from "#/lib/database/tables/worlds/repository.ts";
import createRoute from "./route.ts";

Deno.test("SPARQL API routes", async (t) => {
  const testContext = await createTestContext();
  const app = createRoute(testContext);
  const worldsRepository = new WorldsRepository(testContext.libsql.database);

  await t.step(
    "GET /worlds/:world/sparql (Admin)",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);
      const worldId = ulid();
      const now = Date.now();
      await worldsRepository.insert({
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
        new Request(`http://localhost/worlds/${worldId}/sparql`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "query": "SELECT * WHERE { ?s ?p ?o } LIMIT 1",
          },
        }),
      );

      assertEquals(resp.status, 200);
    },
  );

  await t.step(
    "GET /worlds/:world/sparql - Service Description",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);
      const worldId = ulid();
      const now = Date.now();
      await worldsRepository.insert({
        id: worldId,
        slug: "sd-world-" + worldId,
        label: "SD World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      // Request without query parameter should return Service Description
      const resp = await app.fetch(
        new Request(`http://localhost/worlds/${worldId}/sparql`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "text/turtle",
          },
        }),
      );

      assertEquals(resp.status, 200);
      assertEquals(resp.headers.get("Content-Type"), "text/turtle");

      const body = await resp.text();
      // Check for Service Description triples
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
      // Check for advertised languages (SPARQL 1.1 and 1.2)
      assert(body.includes("SPARQL11Query"));
      assert(body.includes("SPARQL12Query"));
      // Check for advertised features
      assert(body.includes("DereferencesURIs"));
      assert(body.includes("TripleTerms"));
    },
  );

  await t.step(
    "GET /worlds/:world/sparql - Service Description (N-Triples)",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);
      const worldId = ulid();
      const now = Date.now();
      await worldsRepository.insert({
        id: worldId,
        slug: "nt-world-" + worldId,
        label: "NT World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      // Request with N-Triples Accept header
      const resp = await app.fetch(
        new Request(`http://localhost/worlds/${worldId}/sparql`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/n-triples",
          },
        }),
      );

      assertEquals(resp.status, 200);
      assertEquals(resp.headers.get("Content-Type"), "application/n-triples");

      const body = await resp.text();
      // N-Triples should not have prefixes, only full IRIs in brackets
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
    "GET /worlds/:world/sparql - Weighted Content Negotiation",
    async () => {
      const { apiKey } = await createTestOrganization(testContext);
      const worldId = ulid();
      const now = Date.now();
      await worldsRepository.insert({
        id: worldId,
        slug: "post-sd-world-" + worldId,
        label: "Weighted World",
        description: null,
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      await testContext.libsql.manager.create(worldId);

      // Request with weighted Accept header: prefer NTriples over Turtle
      const resp = await app.fetch(
        new Request(`http://localhost/worlds/${worldId}/sparql`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/n-triples;q=1.0, text/turtle;q=0.5",
          },
        }),
      );

      assertEquals(resp.status, 200);
      assertEquals(resp.headers.get("Content-Type"), "application/n-triples");
    },
  );
});
