import { assertEquals } from "@std/assert";
import { Store } from "oxigraph";
import { serializeSparqlResult } from "./sparql-result-serializer.ts";
import {
  v1LiteralSchema,
  v1NamedNodeSchema,
  v1QuadSchema,
  v1SparqlQueryResultsSchema,
} from "#/v1/schemas.ts";

Deno.test("serializeSparqlResult - boolean (true)", () => {
  const result = serializeSparqlResult(true);
  assertEquals(result, true);
  // Validate against schema
  v1SparqlQueryResultsSchema.parse(result);
});

Deno.test("serializeSparqlResult - boolean (false)", () => {
  const result = serializeSparqlResult(false);
  assertEquals(result, false);
  v1SparqlQueryResultsSchema.parse(result);
});

Deno.test("serializeSparqlResult - string", () => {
  const result = serializeSparqlResult("test string");
  assertEquals(result, "test string");
  v1SparqlQueryResultsSchema.parse(result);
});

Deno.test("serializeSparqlResult - empty array", () => {
  const result = serializeSparqlResult([]);
  assertEquals(result, []);
  v1SparqlQueryResultsSchema.parse(result);
});

Deno.test("serializeSparqlResult - SELECT results", () => {
  const store = new Store();
  store.load(
    '<http://example.com/s> <http://example.com/p> "value" .',
    { format: "application/n-quads" },
  );

  const queryResult = store.query("SELECT * WHERE { ?s ?p ?o }");
  const serialized = serializeSparqlResult(queryResult);

  // Validate against schema
  const parsed = v1SparqlQueryResultsSchema.parse(serialized);
  assertEquals(Array.isArray(parsed), true);

  const arr = parsed as Array<Record<string, unknown>>;
  assertEquals(arr.length, 1);

  // Validate individual terms
  v1NamedNodeSchema.parse(arr[0].s);
  assertEquals(arr[0].s, {
    termType: "NamedNode",
    value: "http://example.com/s",
  });

  v1NamedNodeSchema.parse(arr[0].p);
  assertEquals(arr[0].p, {
    termType: "NamedNode",
    value: "http://example.com/p",
  });

  v1LiteralSchema.parse(arr[0].o);
  const o = arr[0].o as Record<string, unknown>;
  assertEquals(o.termType, "Literal");
  assertEquals(o.value, "value");
});

Deno.test("serializeSparqlResult - SELECT with language tag", () => {
  const store = new Store();
  store.load(
    '<http://example.com/s> <http://example.com/p> "hello"@en .',
    { format: "application/n-quads" },
  );

  const queryResult = store.query("SELECT * WHERE { ?s ?p ?o }");
  const serialized = serializeSparqlResult(queryResult);

  // Validate against schema
  const parsed = v1SparqlQueryResultsSchema.parse(serialized);
  const arr = parsed as Array<Record<string, unknown>>;

  v1LiteralSchema.parse(arr[0].o);
  const o = arr[0].o as Record<string, unknown>;
  assertEquals(o.termType, "Literal");
  assertEquals(o.value, "hello");
  assertEquals(o.language, "en");
});

Deno.test("serializeSparqlResult - CONSTRUCT results", () => {
  const store = new Store();
  store.load(
    '<http://example.com/s> <http://example.com/p> "value" .',
    { format: "application/n-quads" },
  );

  const queryResult = store.query(
    "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",
  );
  const serialized = serializeSparqlResult(queryResult);

  // Validate against schema
  const parsed = v1SparqlQueryResultsSchema.parse(serialized);
  assertEquals(Array.isArray(parsed), true);

  const arr = parsed as Array<Record<string, unknown>>;
  assertEquals(arr.length, 1);

  // Validate the quad structure
  v1QuadSchema.parse(arr[0]);
  assertEquals(arr[0].termType, "Quad");

  v1NamedNodeSchema.parse(arr[0].subject);
  assertEquals(arr[0].subject, {
    termType: "NamedNode",
    value: "http://example.com/s",
  });

  v1NamedNodeSchema.parse(arr[0].predicate);
  assertEquals(arr[0].predicate, {
    termType: "NamedNode",
    value: "http://example.com/p",
  });

  v1LiteralSchema.parse(arr[0].object);
  const obj = arr[0].object as Record<string, unknown>;
  assertEquals(obj.termType, "Literal");
  assertEquals(obj.value, "value");
});
