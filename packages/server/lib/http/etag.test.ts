import { assertEquals, assertExists } from "@std/assert";
import { handleETagRequest } from "./etag.ts";
import { STATUS_CODE } from "@std/http/status";

Deno.test("handleETagRequest utility", async (t) => {
  const body = "Hello, world!";
  const headers = new Headers({ "Content-Type": "text/plain" });

  await t.step("adds ETag header to 200 OK response", async () => {
    const request = new Request("http://localhost/");
    const response = new Response(body, { status: STATUS_CODE.OK, headers });

    const result = await handleETagRequest(request, response);

    assertEquals(result.status, STATUS_CODE.OK);
    assertExists(result.headers.get("etag"));
    assertEquals(await result.text(), body);
  });

  await t.step(
    "returns 304 Not Modified if If-None-Match matches",
    async () => {
      const request1 = new Request("http://localhost/");
      const response1 = new Response(body, { status: STATUS_CODE.OK, headers });
      const result1 = await handleETagRequest(request1, response1);
      const etag = result1.headers.get("etag")!;

      const request2 = new Request("http://localhost/", {
        headers: { "if-none-match": etag },
      });
      const response2 = new Response(body, { status: STATUS_CODE.OK, headers });
      const result2 = await handleETagRequest(request2, response2);

      assertEquals(result2.status, STATUS_CODE.NotModified);
      assertEquals(result2.headers.get("etag"), etag);
      assertEquals(result2.body, null);
    },
  );

  await t.step("returns 200 OK if If-None-Match does not match", async () => {
    const request = new Request("http://localhost/", {
      headers: { "if-none-match": '"wrong-etag"' },
    });
    const response = new Response(body, { status: STATUS_CODE.OK, headers });
    const result = await handleETagRequest(request, response);

    assertEquals(result.status, STATUS_CODE.OK);
    assertExists(result.headers.get("etag"));
  });

  await t.step("ignores non-200 responses", async () => {
    const request = new Request("http://localhost/");
    const response = new Response("Not Found", {
      status: STATUS_CODE.NotFound,
    });
    const result = await handleETagRequest(request, response);

    assertEquals(result.status, STATUS_CODE.NotFound);
    assertEquals(result.headers.get("etag"), null);
  });

  await t.step("ignores responses without a body", async () => {
    const request = new Request("http://localhost/");
    const response = new Response(null, { status: STATUS_CODE.OK });
    const result = await handleETagRequest(request, response);

    assertEquals(result.status, STATUS_CODE.OK);
    assertEquals(result.headers.get("etag"), null);
  });
});
