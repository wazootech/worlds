import { assert, assertEquals } from "@std/assert";
import { kvAppContext } from "#/app-context.ts";
import createApp from "./route.ts";

const kv = await Deno.openKv(":memory:");
const app = await createApp(kvAppContext(kv));

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
        "Authorization": "Bearer test-token",
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
          "Authorization": "Bearer test-token",
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
        "Authorization": "Bearer test-token",
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
            "Authorization": "Bearer test-token",
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
