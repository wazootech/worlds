import { assertEquals } from "@std/assert";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Store } from "oxigraph";
import { DenoKvOxigraphService } from "#/oxigraph/deno-kv-oxigraph-service.ts";
import { app, withOxigraphService } from "./route.ts";

Deno.test("POST /v1/stores/{store} appends data", async () => {
  const kv = await Deno.openKv(":memory:");
  const service = new DenoKvOxigraphService(kv);
  const storeId = "test-store-api";

  // Initialize with some data
  const store1 = new Store();
  store1.load('<http://example.com/s1> <http://example.com/p> "o1" .', {
    format: "application/n-quads",
  });
  await service.setStore(storeId, store1);

  // Setup app with service
  const testApp = new OpenAPIHono();
  testApp.use("*", withOxigraphService(service));
  testApp.route("/", app);

  // Make request
  const body = '<http://example.com/s2> <http://example.com/p> "o2" .';
  const req = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "POST",
    headers: { "Content-Type": "application/n-quads" },
    body: body,
  });

  const res = await testApp.request(req);
  assertEquals(res.status, 204);

  // Verify in service
  const resultStore = await service.getStore(storeId);
  assertEquals(resultStore?.size, 2);

  // Verify using GET endpoint too
  const reqGet = new Request(`http://localhost/v1/stores/${storeId}`, {
    method: "GET",
    headers: { "Accept": "application/n-quads" },
  });
  const resGet = await testApp.request(reqGet);
  assertEquals(resGet.status, 200);
  const bodyGet = await resGet.text();
  // Simple check
  assertEquals(bodyGet.includes('"o1"'), true);
  assertEquals(bodyGet.includes('"o2"'), true);

  kv.close();
});
