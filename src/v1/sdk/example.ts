import { assert } from "@std/assert";
import type {
  DecodableEncoding,
  EncodableEncoding,
} from "#/oxigraph/oxigraph-encoding.ts";
import { WorldsApiSdk } from "./sdk.ts";

interface SparqlBinding {
  [key: string]: { type: string; value: string };
}

interface SparqlResult {
  results: {
    bindings: SparqlBinding[];
  };
}

// Configuration
const baseUrl = Deno.env.get("BASE_URL") ?? "http://localhost:8000/v1";
const apiKey = Deno.env.get("API_KEY") ?? "test-token";
const storeId = "example-store";

console.log(`Running SDK example against ${baseUrl} with key ${apiKey}`);

const sdk = new WorldsApiSdk(baseUrl, apiKey);

async function main() {
  try {
    // 1. setStore
    console.log(`\n[1/8] Setting store '${storeId}'...`);
    const initialData = '<http://example.com/s> <http://example.com/p> "o" .';
    await sdk.setStore(storeId, initialData, "application/n-quads");
    console.log("✓ Store set successfully.");

    // 2. getStore
    console.log(`\n[2/8] Getting store '${storeId}'...`);
    const retrieved = await sdk.getStore(storeId, "application/n-quads");
    console.log("Retrieved Data:", retrieved?.trim());
    assert(retrieved?.includes('"o"'), "Store content mismatch");
    console.log("✓ Store retrieved successfully.");

    // 3. addQuads
    console.log(`\n[3/8] Adding quads to '${storeId}'...`);
    const newData = '<http://example.com/s2> <http://example.com/p> "o2" .';
    await sdk.addQuads(storeId, newData, "application/n-quads");
    console.log("✓ Quads added successfully.");

    // Verify addition
    const retrieved2 = await sdk.getStore(storeId, "application/n-quads");
    assert(retrieved2?.includes('"o"'), "Missing original triple");
    assert(retrieved2?.includes('"o2"'), "Missing new triple");
    console.log("✓ Verified content update.");

    // 4. query (SPARQL)
    console.log(`\n[4/8] Executing SPARQL Query...`);
    const selectQuery = "SELECT ?s ?p ?o WHERE { ?s ?p ?o }";
    const queryResult = await sdk.query(storeId, selectQuery) as SparqlResult;
    console.log("Query Result Bindings:", queryResult.results.bindings.length);
    assert(queryResult.results.bindings.length === 2, "Expected 2 bindings");
    console.log("✓ Query executed successfully.");

    // 5. update (SPARQL Update)
    console.log(`\n[5/8] Executing SPARQL Update...`);
    const updateQuery =
      'INSERT DATA { <http://example.com/s3> <http://example.com/p> "o3" }';
    await sdk.update(storeId, updateQuery);

    const queryResultAfterUpdate = await sdk.query(
      storeId,
      selectQuery,
    ) as SparqlResult;
    console.log(
      "Bindings after update:",
      queryResultAfterUpdate.results.bindings.length,
    );
    assert(
      queryResultAfterUpdate.results.bindings.length === 3,
      "Expected 3 bindings",
    );
    console.log("✓ Update executed successfully.");

    // 6. deleteStore
    console.log(`\n[6/8] Deleting store '${storeId}'...`);
    await sdk.deleteStore(storeId);

    const finalGet = await sdk.getStore(storeId, "application/n-quads");
    assert(finalGet === null, "Store should be null after deletion");
    console.log("✓ Store deleted successfully.");

    // 7. Input Encodings
    console.log(`\n[7/8] Testing Input Encodings...`);

    const inputs = [
      {
        format: "application/n-quads",
        data: '<http://example.com/s> <http://example.com/p> "o" .',
      },
      {
        format: "application/trig",
        data: '<http://example.com/s> <http://example.com/p> "o" .',
      },
      {
        format: "application/ld+json",
        data: JSON.stringify({
          "@id": "http://example.com/s",
          "http://example.com/p": [{ "@value": "o" }],
        }),
      },
    ] as const;

    for (const { format, data } of inputs) {
      console.log(`  Testing input format: ${format}...`);
      await sdk.setStore(storeId, data, format as EncodableEncoding);
      const check = await sdk.getStore(storeId, "application/n-quads");
      assert(
        check?.includes('<http://example.com/s> <http://example.com/p> "o"'),
        `Failed to round-trip ${format}`,
      );
      console.log(`  ✓ ${format} worked.`);
    }

    // 8. Output Encodings
    console.log(`\n[8/8] Testing Output Encodings...`);
    // Ensure store is set
    await sdk.setStore(
      storeId,
      '<http://example.com/s> <http://example.com/p> "o" .',
      "application/n-quads",
    );

    const outputFormats = [
      "application/n-quads",
      "application/ld+json",
      "application/trig",
      "text/turtle",
      "application/n-triples",
      "text/n3",
      "application/rdf+xml",
    ] as const;

    for (const format of outputFormats) {
      console.log(`  Testing output format: ${format}...`);
      const res = await sdk.getStore(storeId, format as DecodableEncoding);
      assert(res !== null, `Got null for ${format}`);
      assert(res.length > 0, `Got empty response for ${format}`);
      console.log(`  ✓ ${format} response length: ${res.length}`);
    }

    // Cleanup
    await sdk.deleteStore(storeId);

    console.log("\nAll example steps completed successfully! 🎉");
  } catch (err) {
    console.error("\n❌ Example failed:", err);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (err) {
    console.error(err);
    Deno.exit(1);
  }
}
