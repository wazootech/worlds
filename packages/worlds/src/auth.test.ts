import { assertEquals } from "@std/assert";
import { LocalWorlds } from "./local.ts";
import { KernelRepository } from "./database/repositories/system/kernel/repository.ts";
import { authorizeRequest } from "../../server/src/middleware/auth.ts";
import { createTestContext } from "./engine-context.ts";

Deno.test("KernelRepository & Auth Middleware", async (t) => {
  await using appContext = await createTestContext();
  await using worlds = new LocalWorlds(appContext);
  appContext.engine = worlds;
  await worlds.init();

  const repo = new KernelRepository(worlds);

  await t.step("resolveOrganization finds organizations", async () => {
    // The admin key is seeded by LocalWorlds.init()
    const orgId = await repo.resolveOrganization(appContext.apiKey!);
    assertEquals(typeof orgId, "string");
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
    assertEquals(auth.organizationId, undefined);
  });
});
