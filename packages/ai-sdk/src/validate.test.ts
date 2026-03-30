import { assert, assertEquals } from "@std/assert";
import { validateRdf } from "./validate.ts";

Deno.test("validateRdf function - Basic Ontology", async () => {
  const ontology = {
    classes: ["http://example.org/Person"],
    properties: ["http://example.org/name"],
  };

  const triple = {
    subject: "http://example.org/alice",
    predicate: "http://example.org/name",
    object: "Alice",
  };

  const result = await validateRdf({ triples: [triple], ontology });
  assertEquals(result.isValid, true);
  assertEquals(result.errors.length, 0);

  const invalidTriple = {
    subject: "http://example.org/alice",
    predicate: "http://example.org/unknown",
    object: "Bob",
  };

  const result2 = await validateRdf({ triples: [invalidTriple], ontology });
  assertEquals(result2.isValid, false);
  assert(
    result2.errors.some((e: string) =>
      e.includes("Predicate 'http://example.org/unknown' is not allowed")
    ),
  );
});

Deno.test("validateRdf function - SHACL Validation", async () => {
  const ontology = {
    classes: ["http://example.org/Person"],
    properties: ["http://example.org/age"],
    shacl: `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      ex:PersonShape
        a sh:NodeShape ;
        sh:targetClass ex:Person ;
        sh:property [
          sh:path ex:age ;
          sh:datatype xsd:string ;
          sh:minCount 1 ;
          sh:maxCount 1 ;
        ] .
    `,
  };

  const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

  // Valid: Alice has 1 age (string)
  const validRdf = [
    {
      subject: "http://example.org/alice",
      predicate: RDF_TYPE,
      object: "http://example.org/Person",
    },
    {
      subject: "http://example.org/alice",
      predicate: "http://example.org/age",
      object: "25",
    },
  ];

  const result = await validateRdf({ triples: validRdf, ontology });
  assertEquals(result.isValid, true, result.errors.join(", "));

  // Invalid: Alice has no age (minCount 1)
  const invalidRdf = [
    {
      subject: "http://example.org/alice",
      predicate: RDF_TYPE,
      object: "http://example.org/Person",
    },
  ];

  const result2 = await validateRdf({ triples: invalidRdf, ontology });
  assertEquals(result2.isValid, false);
  assert(result2.errors.some((e: string) => e.includes("SHACL Error")));
});

Deno.test("validateRdf function - Context-Aware (Effective Graph) Validation", async () => {
  const ontology = {
    classes: ["http://example.org/Person"],
    properties: ["http://example.org/age"],
    shacl: `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      ex:PersonShape
        a sh:NodeShape ;
        sh:targetClass ex:Person ;
        sh:property [
          sh:path ex:age ;
          sh:minCount 1 ;
          sh:maxCount 1 ;
        ] .
    `,
  };

  const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  const ALICE = "http://example.org/alice";
  const AGE = "http://example.org/age";
  const PERSON = "http://example.org/Person";

  // Case 1: Existing triple in the world
  const contextRdf = [
    { subject: ALICE, predicate: RDF_TYPE, object: PERSON },
    { subject: ALICE, predicate: AGE, object: "25" },
  ];

  // Proposing a second age (violates maxCount 1)
  const proposedRdf = [
    { subject: ALICE, predicate: AGE, object: "26" },
  ];

  const result = await validateRdf(
    { triples: proposedRdf, ontology },
    {},
    contextRdf,
  );

  assertEquals(result.isValid, false);
  assert(
    result.errors.some((e: string) => e.includes("SHACL Error")),
    "Validation should fail due to maxCount violation when context is included",
  );

  // Case 2: Proposing the same triple that already exists (valid, idempotent-ish in SHACL)
  // Actually, even the same triple twice might violate maxCount 1 if SHACL engine treats them as distinct quads.
  // But typically SHACL works on the graph (set of triples).
  // Let's test a valid case with context.
  const validProposed = [
    { subject: ALICE, predicate: "http://example.org/name", object: "Alice" },
  ];
  // Note: we need to add name to ontology for this to be valid
  const result2 = await validateRdf(
    {
      triples: validProposed,
      ontology: {
        ...ontology,
        properties: [...ontology.properties, "http://example.org/name"],
      },
    },
    {},
    contextRdf,
  );
  assertEquals(result2.isValid, true, result2.errors.join(", "));
});
