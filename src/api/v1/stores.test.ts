import { assertEquals } from "@std/assert/equals";
import { OpenAPIHono } from "@hono/zod-openapi";
import { namedNode, quad, Store } from "oxigraph";
import {
  encodableEncodings,
  encodeStore,
} from "#/oxigraph/oxigraph-encoding.ts";
import { DenoKvOxigraphService } from "#/oxigraph/deno-kv-oxigraph-service.ts";
import { app as storeApp, withOxigraphService } from "./stores.ts";

// Use in-memory kv for testing.
const kv = await Deno.openKv(":memory:");
const oxigraphService = new DenoKvOxigraphService(kv);

const app = new OpenAPIHono();
app.use(withOxigraphService(oxigraphService));

// Mount the store app.
app.route("/v1", storeApp);

// Encode a fake store.
const encoded = await encodeStore(
  new Store([
    quad(
      namedNode("http://example.com/subject"),
      namedNode("http://example.com/predicate"),
      namedNode("http://example.com/object"),
    ),
  ]),
  encodableEncodings.nq,
);

Deno.test("e2e Stores API", async (t) => {
  // Set the store.
  await t.step("POST /stores/{store}", async () => {
    const response = await app.request("/v1/stores/test-store", {
      method: "POST",
      body: encoded as BodyInit,
      headers: {
        "Content-Type": encodableEncodings.nq,
      },
    });
    assertEquals(response.status, 201);
  });

  // Get the store.
  await t.step("GET /stores/{store}", async () => {
    const response = await app.request("/v1/stores/test-store", {
      method: "GET",
      headers: {
        "Accept": encodableEncodings.nq,
      },
    });
    assertEquals(response.status, 200);
    assertEquals(await response.bytes(), encoded);
  });

  // Delete the store.
  await t.step("DELETE /stores/{store}", async () => {
    const response = await app.request("/v1/stores/test-store", {
      method: "DELETE",
    });
    assertEquals(response.status, 204);
  });
});
