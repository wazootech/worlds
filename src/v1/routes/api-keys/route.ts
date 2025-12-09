import { Router } from "@fartlabs/rt";
import type { AppContext } from "#/app-context.ts";
import { auth } from "#/auth.ts";

export default ({ apiKeysService }: AppContext) => {
  return new Router()
    .post("/v1/api-keys", async (ctx) => {
      if (!(await auth(ctx.request))) {
        return new Response("Unauthorized", { status: 401 });
      }

      let body;
      try {
        body = await ctx.request.json();
      } catch (_e) {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const { key } = body;
      if (!key || typeof key !== "string") {
        return Response.json({ error: "Missing or invalid key" }, {
          status: 400,
        });
      }

      await apiKeysService.add(key);
      return new Response(null, { status: 204 });
    })
    .delete("/v1/api-keys/:key", async (ctx) => {
      if (!(await auth(ctx.request))) {
        return new Response("Unauthorized", { status: 401 });
      }

      const key = ctx.params?.pathname.groups.key;
      if (!key) {
        return Response.json({ error: "API key required" }, { status: 400 });
      }

      await apiKeysService.remove(key);
      return new Response(null, { status: 204 });
    });
};
