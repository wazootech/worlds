import { RemoteWorlds } from "../packages/worlds/src/worlds/remote.ts";

const baseUrl = Deno.env.get("WORLDS_API_URL") || "http://localhost:8000";
const apiKey = Deno.env.get("WORLDS_API_KEY") || "test_key";

const worlds = new RemoteWorlds({
  baseUrl,
  apiKey,
});

async function main() {
  console.log("--- Radical API Verification ---");

  // 1. Create two test worlds
  const slug1 = `test-world-1-${Date.now()}`;
  const slug2 = `test-world-2-${Date.now()}`;

  console.log(`Creating world 1: ${slug1}`);
  await worlds.create({ slug: slug1, label: "World 1" });

  console.log(`Creating world 2: ${slug2}`);
  await worlds.create({ slug: slug2, label: "World 2" });

  // 2. Import data into world 1
  console.log("Importing data into world 1...");
  await worlds.import({
    source: slug1,
    data:
      `<https://example.org/subject1> <https://example.org/predicate> "Value 1" .`,
    contentType: "application/n-triples",
  });

  // 3. Import data into world 2
  console.log("Importing data into world 2...");
  await worlds.import({
    source: slug2,
    data:
      `<https://example.org/subject2> <https://example.org/predicate> "Value 2" .`,
    contentType: "application/n-triples",
  });

  // Wait for indexing
  console.log("Waiting for indexing...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 4. Global SPARQL Query
  console.log("Executing global SPARQL query...");
  const sparqlResult = await worlds.sparql({
    sources: ["*"],
    query: `SELECT ?s ?v WHERE { ?s <https://example.org/predicate> ?v }`,
  });

  if (
    sparqlResult && "results" in sparqlResult &&
    (sparqlResult.results as any).bindings
  ) {
    const bindings = (sparqlResult.results as any).bindings;
    console.log(`Global SPARQL found ${bindings.length} results.`);
    bindings.forEach((b: any) => {
      console.log(` - ${b.s.value}: ${b.v.value}`);
    });

    const hasBoth = bindings.some((b: any) => b.v.value === "Value 1") &&
      bindings.some((b: any) => b.v.value === "Value 2");

    if (hasBoth) {
      console.log("✅ Global SPARQL success: Data from both worlds returned.");
    } else {
      console.error(
        "❌ Global SPARQL failed: Data missing from one or more worlds.",
      );
    }
  }

  // 5. Global Search
  console.log("Executing global search...");
  const searchResults = await worlds.search({
    sources: ["*"],
    query: "Value",
    limit: 10,
  });

  console.log(`Global Search found ${searchResults.length} results.`);
  const worldsInSearch = new Set(searchResults.map((r) => r.world.slug));
  console.log("Worlds found in search:", worldsInSearch);

  if (worldsInSearch.has(slug1) && worldsInSearch.has(slug2)) {
    console.log("✅ Global Search success: Results from both worlds returned.");
  } else {
    console.error(
      "❌ Global Search failed: Results missing from one or more worlds.",
    );
  }

  // 6. Cleanup
  console.log("Cleaning up...");
  await worlds.delete({ source: slug1 });
  await worlds.delete({ source: slug2 });

  console.log("--- Verification Complete ---");
}

main().catch(console.error);
