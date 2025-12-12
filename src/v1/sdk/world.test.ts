import { assert } from "@std/assert/assert";
import { kvAppContext } from "#/app-context.ts";
import worldsApp from "#/v1/routes/worlds/route.ts";
import worldsSparqlApp from "#/v1/routes/worlds/sparql/route.ts";
import type { Account } from "#/accounts/accounts-service.ts";
import { World } from "./world.ts";

const kv = await Deno.openKv(":memory:");
const appContext = kvAppContext(kv);

const worldId = "test-single-world";

// Create a test account with access to test world
const testAccount: Account = {
  id: "test-account-single",
  description: "Test account for Single World SDK tests",
  plan: "free_plan",
  accessControl: {
    worlds: ["non-existent-world-single", worldId],
  },
};
await appContext.accountsService.set(testAccount);

const testApiKey = "test-account-single";

Deno.test("e2e World (Single)", async (t) => {
  const sdk = new World({
    baseUrl: "http://localhost/v1",
    apiKey: testApiKey,
    worldId: worldId,
  });

  const missingSdk = new World({
    baseUrl: "http://localhost/v1",
    apiKey: testApiKey,
    worldId: "non-existent-world-single",
  });

  globalThis.fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const request = new Request(input, init);
    return worldsApp(appContext).fetch(request);
  };

  await t.step("get returns null for non-existent world", async () => {
    const world = await missingSdk.get("application/n-quads");
    assert(world === null);
  });

  await t.step("set sets the world", async () => {
    await sdk.set(
      '<http://example.com/s> <http://example.com/p> "o" .\n',
      "application/n-quads",
    );
  });

  await t.step("get returns data for existing world", async () => {
    const world = await sdk.get("application/n-quads");
    assert(world !== null);
  });

  await t.step("addQuads adds quads to world", async () => {
    await sdk.addQuads(
      '<http://example.com/s2> <http://example.com/p> "o2" .\n',
      "application/n-quads",
    );
  });

  globalThis.fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const request = new Request(input, init);
    return worldsSparqlApp(appContext).fetch(request);
  };

  await t.step("query returns results for existing world", async () => {
    const results = await sdk.query(
      "SELECT ?s ?p ?o WHERE { ?s ?p ?o }",
    );
    assert(Array.isArray(results));
    assert(results.length > 0);
  });

  await t.step("update updates the world", async () => {
    await sdk.update(
      'INSERT DATA { <http://example.com/s3> <http://example.com/p> "o3" }',
    );
  });

  globalThis.fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const request = new Request(input, init);
    return worldsApp(appContext).fetch(request);
  };

  await t.step("get returns metadata for application/json", async () => {
    const metadataStr = await sdk.get("application/json");
    assert(metadataStr !== null);
    const metadata = JSON.parse(metadataStr!);
    assert(metadata.id === worldId);
  });

  await t.step("getUsage returns usage summary", async () => {
    const usage = await sdk.getUsage();
    assert(typeof usage === "object");
    // Ensure usage object has correct shape
    // usage is WorldUsageSummary, which is { reads: number, writes: number, ... }
    assert(typeof usage.reads === "number");
  });

  await t.step("remove removes the world", async () => {
    await sdk.remove();
  });
});
