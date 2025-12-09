import { Router } from "@fartlabs/rt";
import { expandGlob } from "@std/fs";
import { toFileUrl } from "@std/path";
import type { AppContext } from "#/app-context.ts";
import { kvAppContext } from "#/app-context.ts";

const kv = await Deno.openKv(Deno.env.get("DENO_KV_PATH"));

const appContext = kvAppContext(kv);

const app = await createApp(appContext);

export default app satisfies Deno.ServeDefaultExport;

export async function createApp(appContext: AppContext) {
  const app = new Router();

  for await (
    const entry of expandGlob("./src/v1/routes/**/route.ts")
  ) {
    const module = await import(toFileUrl(entry.path).href);
    if (typeof module.default === "function") {
      const subRouter = module.default(appContext);

      app.use(subRouter);
    }
  }

  return app;
}
