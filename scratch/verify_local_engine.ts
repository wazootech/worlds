import { LocalWorlds } from "../packages/worlds/src/worlds/local.ts";
import { MemoryDatabaseManager } from "../packages/worlds/src/storage/memory-manager.ts";
import { createClient } from "@libsql/client";

async function main() {
  console.log("--- Local Engine Verification (Fixed Fix) ---");

  const client = createClient({ url: ":memory:" });
  const dimensions = 1536;

  // Minimal setup for WorldsContext
  const appContext = {
    libsql: {
      database: client,
      manager: new MemoryDatabaseManager(dimensions),
    },
    embeddings: {
      embed: async (texts: string[]) =>
        texts.map(() => new Array(dimensions).fill(0)),
    },
    namespace: "default",
  } as any;

  // Initialize DB tables
  await client.execute(
    `CREATE TABLE IF NOT EXISTS worlds (namespace_id TEXT, slug TEXT, label TEXT, description TEXT, db_hostname TEXT, db_token TEXT, created_at INTEGER, updated_at INTEGER, deleted_at INTEGER, PRIMARY KEY(namespace_id, slug))`,
  );

  const engine = new LocalWorlds(appContext);

  const slug1 = "test-1";
  const slug2 = "test-2";
  const ns = "default";

  await engine.create({ slug: slug1, label: "World 1" });
  await engine.create({ slug: slug2, label: "World 2" });

  console.log("Importing to world 1...");
  await engine.import({
    source: slug1,
    data: `<https://example.org/s1> <https://example.org/p> "V1" .`,
    contentType: "application/n-triples",
  });

  console.log("Importing to world 2...");
  await engine.import({
    source: slug2,
    data: `<https://example.org/s2> <https://example.org/p> "V2" .`,
    contentType: "application/n-triples",
  });

  console.log("Executing global SPARQL...");
  const sparqlResult = await engine.sparql({
    query: `SELECT ?s ?v WHERE { ?s <https://example.org/p> ?v }`,
    namespace: ns,
  });

  console.log("Global SPARQL Results:", JSON.stringify(sparqlResult, null, 2));

  if (
    sparqlResult && "results" in sparqlResult &&
    (sparqlResult.results as any).bindings
  ) {
    const bindings = (sparqlResult.results as any).bindings;
    if (bindings.length >= 2) {
      console.log("✅ Global SPARQL success!");
    } else {
      console.error("❌ Global SPARQL failed: missing results.");
    }
  }

  console.log("Executing global search...");
  const searchResults = await engine.search({
    query: "V",
    namespace: ns,
  });

  console.log("Global Search Results count:", searchResults.length);
  if (searchResults.length >= 2) {
    console.log("✅ Global Search success!");
  } else {
    console.error("❌ Global Search failed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
