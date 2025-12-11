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
import { authorizeRequest } from "#/accounts/authorize.ts";
import { plans, reachedPlanLimit } from "#/accounts/plans.ts";

export default ({ oxigraphService, accountsService }: AppContext) => {
  return new Router()
    .get("/v1/stores/:store", async (ctx) => {
      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) {
        return new Response("Store ID required", { status: 400 });
      }

      const authorized = await authorizeRequest(accountsService, ctx.request);
      if (!authorized) {
        return new Response("Unauthorized", { status: 401 });
      }

      if (
        !authorized.admin &&
        !authorized.account?.accessControl.stores.includes(storeId)
      ) {
        return new Response("Store not found", { status: 404 });
      }

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
    .get("/v1/stores/:store/metadata", async (ctx) => {
      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) {
        return new Response("Store ID required", { status: 400 });
      }

      const authorized = await authorizeRequest(accountsService, ctx.request);
      if (!authorized) {
        return new Response("Unauthorized", { status: 401 });
      }

      if (
        !authorized.admin &&
        !authorized.account?.accessControl.stores.includes(storeId)
      ) {
        return new Response("Store not found", { status: 404 });
      }

      const metadata = await oxigraphService.getMetadata(storeId);
      if (!metadata) {
        return new Response("Store not found", { status: 404 });
      }

      return Response.json(metadata);
    })
    .put("/v1/stores/:store", async (ctx) => {
      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) {
        return new Response("Store ID required", { status: 400 });
      }

      const authorized = await authorizeRequest(accountsService, ctx.request);
      if (!authorized || (!authorized.admin && !authorized.account)) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Check if store already exists
      const existingMetadata = await oxigraphService.getMetadata(storeId);

      // For existing stores, verify access
      if (existingMetadata) {
        if (
          !authorized.admin &&
          !authorized.account?.accessControl.stores.includes(storeId)
        ) {
          // Privacy: Return 404 instead of 401 to hide existence
          return new Response("Store not found", { status: 404 });
        }
      } else {
        // For new stores, check plan limits (skip for admin)
        if (!authorized.admin && authorized.account) {
          if (reachedPlanLimit(authorized.account)) {
            return Response.json(
              {
                error: "Plan limit reached",
                limit: plans[authorized.account.plan].stores,
              },
              { status: 403 },
            );
          }

          // Add store to account's access control
          authorized.account.accessControl.stores.push(storeId);
          await accountsService.set(authorized.account);
        }
      }

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

        // Determine owner: use account ID if available, otherwise "admin" if admin
        const owner = authorized.account?.id ||
          (authorized.admin ? "admin" : "unknown");

        await oxigraphService.setStore(storeId, owner, store);
        return new Response(null, { status: 204 });
      } catch (error) {
        return Response.json(
          { error: "Invalid RDF Syntax", details: String(error) },
          { status: 400 },
        );
      }
    })
    .post("/v1/stores/:store", async (ctx) => {
      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) {
        return new Response("Store ID required", { status: 400 });
      }

      const authorized = await authorizeRequest(accountsService, ctx.request);
      if (!authorized || (!authorized.admin && !authorized.account)) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Check if store already exists
      const existingMetadata = await oxigraphService.getMetadata(storeId);

      // For existing stores, verify access
      if (existingMetadata) {
        if (
          !authorized.admin &&
          !authorized.account?.accessControl.stores.includes(storeId)
        ) {
          // Privacy: Return 404 instead of 401 to hide existence
          return new Response("Store not found", { status: 404 });
        }
      } else {
        // For new stores, check plan limits (skip for admin)
        if (!authorized.admin && authorized.account) {
          if (reachedPlanLimit(authorized.account)) {
            return Response.json(
              {
                error: "Plan limit reached",
                limit: plans[authorized.account.plan].stores,
              },
              { status: 403 },
            );
          }

          // Add store to account's access control
          authorized.account.accessControl.stores.push(storeId);
          await accountsService.set(authorized.account);
        }
      }

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

        // Determine owner: use account ID if available, otherwise "admin" if admin
        const owner = authorized.account?.id ||
          (authorized.admin ? "admin" : "unknown");

        await oxigraphService.addQuads(storeId, owner, store.match());
        return new Response(null, { status: 204 });
      } catch (error) {
        return Response.json(
          { error: "Invalid RDF Syntax", details: String(error) },
          { status: 400 },
        );
      }
    })
    .delete("/v1/stores/:store", async (ctx) => {
      const storeId = ctx.params?.pathname.groups.store;
      if (!storeId) {
        return new Response("Store ID required", { status: 400 });
      }

      const authorized = await authorizeRequest(accountsService, ctx.request);
      if (!authorized) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Get store metadata to check ownership
      const metadata = await oxigraphService.getMetadata(storeId);

      // Privacy check: verify access list first
      if (
        !authorized.admin &&
        !authorized.account?.accessControl.stores.includes(storeId)
      ) {
        return new Response("Store not found", { status: 404 });
      }

      if (!metadata) {
        return new Response("Store not found", { status: 404 });
      }

      // Only allow deletion by owner or admin
      if (!authorized.admin) {
        if (
          !authorized.account || metadata.createdBy !== authorized.account.id
        ) {
          return Response.json(
            { error: "Forbidden: Only the store owner can delete this store" },
            { status: 403 },
          );
        }
      }

      await oxigraphService.removeStore(storeId);

      // Remove from account's access control
      if (authorized.account) {
        const originalLength = authorized.account.accessControl.stores.length;
        authorized.account.accessControl.stores = authorized.account
          .accessControl.stores.filter(
            (id) => id !== storeId,
          );
        if (authorized.account.accessControl.stores.length < originalLength) {
          await accountsService.set(authorized.account);
        }
      }

      return new Response(null, { status: 204 });
    });
};
