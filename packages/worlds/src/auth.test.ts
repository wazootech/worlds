import { assertEquals } from "@std/assert";
import { LocalWorlds } from "./local.ts";
import { RegistryRepository } from "./database/repositories/system/registry/repository.ts";
import { authorizeRequest } from "../../server/src/middleware/auth.ts";
import { createTestContext } from "./engine-context.ts";

Deno.test("RegistryRepository & Auth Middleware", async (t) => {
  await using appContext = await createTestContext();
  await using worlds = new LocalWorlds(appContext);
  appContext.engine = worlds;
  await worlds.init();

  const repo = new RegistryRepository(worlds);

  await t.step("resolveNamespace finds namespaces", async () => {
    // The admin key is seeded by LocalWorlds.init()
    const namespaceId = await repo.resolveNamespace(appContext.apiKey!);
    assertEquals(typeof namespaceId, "string");
  });

  await t.step("authorizeRequest validates keys", async () => {
    const req = new Request("http://localhost/worlds", {
      headers: { "Authorization": `Bearer ${appContext.apiKey}` },
    });
    const auth = await authorizeRequest(appContext, req);
    assertEquals(auth.admin, true);
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
