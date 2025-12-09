import { Router } from "@fartlabs/rt";
import { accepts } from "@std/http/negotiation";
import type {
  DecodableEncoding,
  EncodableEncoding,
} from "#/oxigraph/oxigraph-encoding.ts";
import {
  decodableEncodings,
  decodeStore,
  encodableEncodings,
  encodeStore,
} from "#/oxigraph/oxigraph-encoding.ts";
import type { AppContext } from "#/app-context.ts";
import { auth } from "#/auth.ts";

export default ({ oxigraphService, apiKeysService }: AppContext) => {
  return new Router()
    .get("/v1/stores/:store", async (ctx) => {
      const isAuthenticated = await auth(ctx.request, apiKeysService);
      if (!isAuthenticated) {
        return new Response("Unauthorized", { status: 401 });
      }

      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) return new Response("Store ID required", { status: 400 });

      const store = await oxigraphService.getStore(storeId);
      if (!store) {
        return new Response("Store not found", { status: 404 });
      }

      const supported = [
        "application/json",
        ...Object.values(encodableEncodings),
      ];
      const encoding = accepts(ctx.request, ...supported) ?? "application/json";

      if (encoding === "application/json") {
        return Response.json({ id: storeId });
      }

      if (!(Object.values(encodableEncodings) as string[]).includes(encoding)) {
        return Response.json({ id: storeId });
      }

      try {
        const data = encodeStore(store, encoding as EncodableEncoding);
        return new Response(data, {
          headers: { "Content-Type": encoding },
        });
      } catch (_error) {
        return Response.json({ error: "Encoding failed" }, { status: 500 });
      }
    })
    .put("/v1/stores/:store", async (ctx) => {
      const isAuthenticated = await auth(ctx.request, apiKeysService);
      if (!isAuthenticated) {
        return new Response("Unauthorized", { status: 401 });
      }

      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) return new Response("Store ID required", { status: 400 });

      const contentType = ctx.request.headers.get("Content-Type");

      if (!contentType) {
        return Response.json({ error: "Content-Type required" }, {
          status: 400,
        });
      }

      if (
        !(Object.values(decodableEncodings) as string[]).includes(contentType)
      ) {
        return Response.json({ error: "Unsupported Content-Type" }, {
          status: 400,
        });
      }

      const bodyText = await ctx.request.text();

      try {
        const stream = new Blob([bodyText]).stream();
        const store = await decodeStore(
          stream,
          contentType as DecodableEncoding,
        );

        await oxigraphService.setStore(storeId, store);
        return new Response(null, { status: 204 });
      } catch (error) {
        return Response.json(
          { error: "Invalid RDF Syntax", details: String(error) },
          { status: 400 },
        );
      }
    })
    .post("/v1/stores/:store", async (ctx) => {
      const isAuthenticated = await auth(ctx.request, apiKeysService);
      if (!isAuthenticated) {
        return new Response("Unauthorized", { status: 401 });
      }

      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) return new Response("Store ID required", { status: 400 });

      const contentType = ctx.request.headers.get("Content-Type");

      if (!contentType) {
        return Response.json({ error: "Content-Type required" }, {
          status: 400,
        });
      }

      if (
        !(Object.values(decodableEncodings) as string[]).includes(contentType)
      ) {
        return Response.json({ error: "Unsupported Content-Type" }, {
          status: 400,
        });
      }

      const bodyText = await ctx.request.text();

      try {
        const stream = new Blob([bodyText]).stream();
        const store = await decodeStore(
          stream,
          contentType as DecodableEncoding,
        );

        await oxigraphService.addQuads(storeId, store.match());
        return new Response(null, { status: 204 });
      } catch (error) {
        return Response.json(
          { error: "Invalid RDF Syntax", details: String(error) },
          { status: 400 },
        );
      }
    })
    .delete("/v1/stores/:store", async (ctx) => {
      const isAuthenticated = await auth(ctx.request, apiKeysService);
      if (!isAuthenticated) {
        return new Response("Unauthorized", { status: 401 });
      }

      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) return new Response("Store ID required", { status: 400 });

      await oxigraphService.removeStore(storeId);
      return new Response(null, { status: 204 });
    });
};
