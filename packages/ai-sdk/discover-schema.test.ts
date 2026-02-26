import { assert, assertEquals } from "@std/assert";
import { createServer } from "@wazoo/worlds-server";
import { createTestContext } from "@wazoo/worlds-server/testing";
import { WorldsSdk } from "@wazoo/worlds-sdk";
import { discoverSchema } from "./discover-schema.ts";

Deno.test("discoverSchema function - Class and Property Discovery", async () => {
  const appContext = await createTestContext();
  const server = await createServer(appContext);

  const sdk = new WorldsSdk({
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey,
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      server.fetch(new Request(url, init)),
  });

  const world = await sdk.worlds.create({
    slug: "discovery-world",
    label: "Discovery World",
  });

  const worldId = world.id!;

  // Insert some schema data
  await sdk.worlds.sparql(
    worldId,
    `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX ex: <http://example.org/>

    INSERT DATA {
      ex:Person a rdfs:Class ;
                rdfs:label "Person" ;
                rdfs:comment "A human being" .
      
      ex:name a owl:DatatypeProperty ;
              rdfs:label "name" ;
              rdfs:domain ex:Person ;
              rdfs:range <http://www.w3.org/2001/XMLSchema#string> .

      ex:knownBy a owl:ObjectProperty ;
                 rdfs:label "knownBy" ;
                 rdfs:domain ex:Person ;
                 rdfs:range ex:Person .

      ex:alice a ex:Person ;
               rdfs:label "Alice" .
    }
  `,
  );

  // 1. Discover "Person"
  const result = await discoverSchema(sdk, {
    source: worldId,
    referenceText: "Person",
  });

  assert(result.results.length > 0);
  const person = result.results.find((r) =>
    r.iri === "http://example.org/Person"
  );
  assert(person !== undefined);
  assertEquals(person.type, "Class");
  assertEquals(person.label, "Person");
  assertEquals(person.description, "A human being");

  // Verify that an instance like Alice is NOT discovered as a schema entity
  const resultAlice = await discoverSchema(sdk, {
    source: worldId,
    referenceText: "Alice",
  });
  const aliceEntry = resultAlice.results.find((r) =>
    r.iri === "http://example.org/alice"
  );
  assertEquals(
    aliceEntry,
    undefined,
    "Instance should not be discovered as schema",
  );

  // 2. Discover "name"
  const result2 = await discoverSchema(sdk, {
    source: worldId,
    referenceText: "name",
  });
  const nameProp = result2.results.find((r) =>
    r.iri === "http://example.org/name"
  );
  assert(nameProp !== undefined);
  assertEquals(nameProp.type, "Property");
  assertEquals(nameProp.label, "name");
  assert("domain" in nameProp);
  assert(nameProp.domain!.includes("http://example.org/Person"));

  // 3. Test limit
  const result3 = await discoverSchema(sdk, {
    source: worldId,
    referenceText: "Person",
    limit: 1,
  });
  assertEquals(result3.results.length, 1);
});
