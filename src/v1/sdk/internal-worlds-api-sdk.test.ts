import { assertRejects } from "@std/assert/rejects";
import { createApp } from "../../../main.ts";
import { kvAppContext } from "#/app-context.ts";
import { InternalWorldsApiSdk } from "./internal-worlds-api-sdk.ts";

const kv = await Deno.openKv(":memory:");
const app = await createApp(kvAppContext(kv));

globalThis.fetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const request = new Request(input, init);
  return app.fetch(request);
};

Deno.test("e2e InternalWorldsApiSdk", async (t) => {
  const sdk = new InternalWorldsApiSdk({
    baseUrl: "http://localhost/v1",
    apiKey: Deno.env.get("API_KEY")!,
  });

  const testKey = "test-api-key-" + Date.now();

  await t.step("addApiKey adds a new API key", async () => {
    await sdk.addApiKey(testKey);
  });

  await t.step("removeApiKey removes an API key", async () => {
    await sdk.removeApiKey(testKey);
  });

  await t.step("addApiKey fails with invalid auth", async () => {
    const invalidSdk = new InternalWorldsApiSdk({
      baseUrl: "http://localhost/v1",
      apiKey: "invalid-key",
    });

    await assertRejects(
      async () => await invalidSdk.addApiKey("some-key"),
      Error,
      "401",
    );
  });

  await t.step("removeApiKey fails with invalid auth", async () => {
    const invalidSdk = new InternalWorldsApiSdk({
      baseUrl: "http://localhost/v1",
      apiKey: "invalid-key",
    });

    await assertRejects(
      async () => await invalidSdk.removeApiKey("some-key"),
      Error,
      "401",
    );
  });
});
