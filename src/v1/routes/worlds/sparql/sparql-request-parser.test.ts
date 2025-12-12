import { assertEquals, assertRejects } from "@std/assert";
import { parseSparqlRequest } from "./sparql-request-parser.ts";

Deno.test("parseSparqlRequest - application/sparql-query", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/sparql-query" },
    body: "SELECT * WHERE { ?s ?p ?o }",
  });
  const result = await parseSparqlRequest(req);
  assertEquals(result, { query: "SELECT * WHERE { ?s ?p ?o }" });
});

Deno.test("parseSparqlRequest - application/sparql-update", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/sparql-update" },
    body: "INSERT DATA { <a> <b> <c> }",
  });
  const result = await parseSparqlRequest(req);
  assertEquals(result, { update: "INSERT DATA { <a> <b> <c> }" });
});

Deno.test("parseSparqlRequest - application/x-www-form-urlencoded (query)", async () => {
  const body = new URLSearchParams({ query: "SELECT * WHERE { ?s ?p ?o }" });
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const result = await parseSparqlRequest(req);
  assertEquals(result, {
    query: "SELECT * WHERE { ?s ?p ?o }",
    update: undefined,
  });
});

Deno.test("parseSparqlRequest - application/x-www-form-urlencoded (update)", async () => {
  const body = new URLSearchParams({ update: "INSERT DATA { <a> <b> <c> }" });
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const result = await parseSparqlRequest(req);
  assertEquals(result, {
    query: undefined,
    update: "INSERT DATA { <a> <b> <c> }",
  });
});

Deno.test("parseSparqlRequest - unsupported content type", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "SELECT * WHERE { ?s ?p ?o }",
  });
  await assertRejects(
    async () => await parseSparqlRequest(req),
    Error,
    "Unsupported Content-Type",
  );
});
