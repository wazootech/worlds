import { assertEquals } from "@std/assert";
import { blankNode, defaultGraph, literal, namedNode, quad } from "oxigraph";
import { fromQuad, toQuad } from "./conversions.ts";
import type { StatementRow } from "./database/statements.ts";

Deno.test("fromQuad - NamedNode object", () => {
  const q = quad(
    namedNode("http://example.com/s"),
    namedNode("http://example.com/p"),
    namedNode("http://example.com/o"),
    namedNode("http://example.com/g"),
  );

  const row = fromQuad(q);

  assertEquals(row.subject, "http://example.com/s");
  assertEquals(row.predicate, "http://example.com/p");
  assertEquals(row.object, "http://example.com/o");
  assertEquals(row.graph, "http://example.com/g");
  assertEquals(row.term_type, "NamedNode");
  assertEquals(row.object_language, "");
  assertEquals(row.object_datatype, "");
});

Deno.test("fromQuad - Literal object with language", () => {
  const q = quad(
    namedNode("http://example.com/s"),
    namedNode("http://example.com/p"),
    literal("hello", "en"),
  );

  const row = fromQuad(q);

  assertEquals(row.object, "hello");
  assertEquals(row.term_type, "Literal");
  assertEquals(row.object_language, "en");
  assertEquals(
    row.object_datatype,
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
  );
});

Deno.test("toQuad - NamedNode object", () => {
  const row: StatementRow = {
    statement_id: 1,
    subject: "http://example.com/s",
    predicate: "http://example.com/p",
    object: "http://example.com/o",
    graph: "http://example.com/g",
    term_type: "NamedNode",
  };

  const q = toQuad(row);

  assertEquals(q.subject.value, "http://example.com/s");
  assertEquals(q.predicate.value, "http://example.com/p");
  assertEquals(q.object.value, "http://example.com/o");
  assertEquals(q.graph.value, "http://example.com/g");
  assertEquals(q.object.termType, "NamedNode");
});

Deno.test("toQuad - Literal object with datatype", () => {
  const row: StatementRow = {
    statement_id: 1,
    subject: "http://example.com/s",
    predicate: "http://example.com/p",
    object: "123",
    graph: "",
    term_type: "Literal",
    object_datatype: "http://www.w3.org/2001/XMLSchema#integer",
  };

  const q = toQuad(row);

  assertEquals(q.object.value, "123");
  assertEquals(q.object.termType, "Literal");
  assertEquals(
    (q.object as any).datatype.value,
    "http://www.w3.org/2001/XMLSchema#integer",
  );
});
