import { assertEquals, assertExists } from "jsr:@std/assert";
import { createTestContext } from "../packages/worlds/src/core/engine-context.ts";
import { LocalWorlds } from "../packages/worlds/src/worlds/local.ts";

async function main() {
  console.log("Setting up test context...");
  const appContext = await createTestContext();
  const worlds = new LocalWorlds(appContext);
  await worlds.init();

  const slug = "index-test";
  console.log(`Creating world: ${slug}`);
  await worlds.create({
    slug,
    label: "Index Test",
  });

  console.log("Inserting triple via SPARQL...");
  await worlds.sparql({
    sources: [slug],
    query: `
      INSERT DATA {
        <http://example.org/subject> <http://example.org/predicate> "The quick brown fox jumps over the lazy dog." .
      }
    `,
  });

  console.log("Verifying SPARQL query...");
  const sparqlResult = await worlds.sparql({
    sources: [slug],
    query: `SELECT ?o WHERE { <http://example.org/subject> <http://example.org/predicate> ?o }`,
  });
  assertExists(sparqlResult);
  console.log("SPARQL query successful.");

  console.log("Performing semantic search...");
  // Wait a moment for any async background tasks if any (though handlePatch is awaited)
  const searchResults = await worlds.search({
    sources: [slug],
    query: "brown fox",
    limit: 1,
  });

  console.log("Search results:", JSON.stringify(searchResults, null, 2));

  if (searchResults.length > 0 && searchResults[0].object.includes("fox")) {
    console.log("SUCCESS: Indexing and search verified.");
  } else {
    console.error("FAILURE: Indexing or search failed.");
    Deno.exit(1);
  }

  await worlds.close();
}

main().catch((err) => {
  console.error(err);
  Deno.exit(1);
});
