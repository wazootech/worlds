import { assertEquals } from "@std/assert";
import { LocalWorlds } from "#/worlds/local.ts";
import { ApiKeysRepository } from "#/plugins/registry/api-keys.repository.ts";
import { authorizeRequest } from "../../../server/src/middleware/auth.ts";
import { createTestContext } from "#/core/engine-context.ts";

Deno.test("ApiKeysRepository & Auth Middleware", async (t) => {
  await using appContext = await createTestContext();
  await using worlds = new LocalWorlds(appContext);
  appContext.engine = worlds;
  await worlds.init();

  const repo = new ApiKeysRepository(appContext.system);

  await t.step("resolveNamespace finds namespaces", async () => {
    // The admin key is seeded by LocalWorlds.init()
    const namespaceId = await repo.resolveNamespace(appContext.apiKey!);
    // The root namespace is represented as undefined/NULL.
    assertEquals(namespaceId, undefined);
  });

  await t.step("authorizeRequest validates keys", async () => {
    const req = new Request("http://localhost/worlds", {
      headers: { "Authorization": `Bearer ${appContext.apiKey}` },
    });
    const auth = await authorizeRequest(appContext, req);
    assertEquals(auth.admin, true);
    // root admin has undefined namespace
    assertEquals(auth.namespaceId, undefined);
  });

  await t.step("authorizeRequest fails for invalid keys", async () => {
    const req = new Request("http://localhost/worlds", {
      headers: { "Authorization": `Bearer invalid-key` },
    });
    const auth = await authorizeRequest(appContext, req);
    assertEquals(auth.admin, false);
    assertEquals(auth.namespaceId, undefined);
  });
});
