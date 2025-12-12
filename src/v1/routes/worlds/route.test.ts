import { assert, assertEquals } from "@std/assert";
import { kvAppContext } from "#/app-context.ts";
import createApp from "./route.ts";
import type { Account } from "#/accounts/accounts-service.ts";

const kv = await Deno.openKv(":memory:");
const appContext = kvAppContext(kv);
const app = await createApp(appContext);

// Create a test account with access to all test worlds
const testAccount: Account = {
  id: "test-account",
  description: "Test account for route tests",
  plan: "free_plan",
  accessControl: {
    worlds: [], // Worlds will be automatically added on creation
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
  Deno.test(`PUT /v1/worlds/{world} accepts ${mime}`, async () => {
    const worldId = `test-world-put-${mime.replace(/[^a-z0-9]/g, "-")}`;

    const req = new Request(`http://localhost/v1/worlds/${worldId}`, {
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
      new Request(`http://localhost/v1/worlds/${worldId}`, {
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

Deno.test("GET /v1/worlds/{world} negotiates content negotiation", async (t) => {
  const worldId = "test-world-conneg";

  // Setup data
  await app.fetch(
    new Request(`http://localhost/v1/worlds/${worldId}`, {
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
        new Request(`http://localhost/v1/worlds/${worldId}`, {
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

Deno.test("GET /v1/worlds/{world} returns metadata for application/json", async () => {
  const worldId = "test-world-metadata";

  // Create world
  await app.fetch(
    new Request(`http://localhost/v1/worlds/${worldId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${testApiKey}`,
      },
      body: '<http://example.com/s> <http://example.com/p> "o" .',
    }),
  );

  // GET with application/json
  const resp = await app.fetch(
    new Request(`http://localhost/v1/worlds/${worldId}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${testApiKey}`,
      },
    }),
  );

  assertEquals(resp.status, 200);
  assertEquals(resp.headers.get("content-type"), "application/json");

  const metadata = await resp.json();
  assertEquals(metadata.id, worldId);
  assert(metadata.createdAt > 0);
  assert(metadata.updatedAt > 0);
  assertEquals(metadata.createdBy, testAccount.id);
  assertEquals(typeof metadata.size, "number");
  assertEquals(typeof metadata.tripleCount, "number");
});

Deno.test("GET /v1/worlds/{world}/usage returns usage for specific world", async () => {
  const worldId = "test-world-usage-specific";

  // Create world
  await app.fetch(
    new Request(`http://localhost/v1/worlds/${worldId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/n-quads",
        "Authorization": `Bearer ${testApiKey}`,
      },
      body: '<http://example.com/s> <http://example.com/p> "o" .',
    }),
  );

  // GET usage
  const resp = await app.fetch(
    new Request(`http://localhost/v1/worlds/${worldId}/usage`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${testApiKey}`,
      },
    }),
  );

  assertEquals(resp.status, 200);
  const usage = await resp.json();
  assert(typeof usage === "object");
  assert(usage.reads !== undefined);
  assert(usage.writes !== undefined);
});
