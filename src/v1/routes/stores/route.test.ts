import { assert, assertEquals } from "@std/assert";
import { kvAppContext } from "#/app-context.ts";
import createApp from "./route.ts";
import type { Account } from "#/accounts/accounts-service.ts";

const kv = await Deno.openKv(":memory:");
const appContext = kvAppContext(kv);
const app = await createApp(appContext);

// Create a test account with access to all test stores
const testAccount: Account = {
  id: "test-account",
  description: "Test account for route tests",
  plan: "free_plan",
  accessControl: {
    stores: [], // Stores will be automatically added on creation
  },
};
await appContext.accountsService.set(testAccount);

const testApiKey = "test-account";

const decodableFormats = [
  {
    mime: "application/n-quads",
    data: '<http://example.com/s> <http://example.com/p> "o" .',
  },
  {
    mime: "application/ld+json",
    data: JSON.stringify([
      {
        "@id": "http://example.com/s",
        "http://example.com/p": [{ "@value": "o" }],
      },
    ]),
  },
  {
    mime: "application/trig",
    data: '<http://example.com/s> <http://example.com/p> "o" .',
  },
];

for (const { mime, data } of decodableFormats) {
  Deno.test(`PUT /v1/stores/{store} accepts ${mime}`, async () => {
    const storeId = `test-store-put-${mime.replace(/[^a-z0-9]/g, "-")}`;

    const req = new Request(`http://localhost/v1/stores/${storeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": mime,
        "Authorization": `Bearer ${testApiKey}`,
      },
      body: data,
    });
    const res = await app.fetch(req);
    assertEquals(res.status, 204);

    // Verify content
    const resGet = await app.fetch(
      new Request(`http://localhost/v1/stores/${storeId}`, {
        method: "GET",
        headers: {
          "Accept": "application/n-quads",
          "Authorization": `Bearer ${testApiKey}`,
        },
      }),
    );
    assertEquals(resGet.status, 200);
    const body = await resGet.text();
    assertEquals(body.includes("http://example.com/s"), true);
  });
}

const encodableFormats = [
  "application/ld+json",
  "application/n-quads",
  "application/trig",
];

Deno.test("GET /v1/stores/{store} negotiates content negotiation", async (t) => {
  const storeId = "test-store-conneg";

  // Setup data
  await app.fetch(
    new Request(`http://localhost/v1/stores/${storeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${testApiKey}`,
      },
      body: '<http://example.com/s> <http://example.com/p> "o" .',
    }),
  );

  for (const mime of encodableFormats) {
    await t.step(`Accept: ${mime}`, async () => {
      const resp = await app.fetch(
        new Request(`http://localhost/v1/stores/${storeId}`, {
          method: "GET",
          headers: {
            "Accept": mime,
            "Authorization": `Bearer ${testApiKey}`,
          },
        }),
      );
      assertEquals(resp.status, 200);
      assertEquals(resp.headers.get("content-type"), mime);
      const text = await resp.text();
      assert(text.length > 0);
    });
  }
});
