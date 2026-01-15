import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";

export default (appContext: AppContext) =>
  new Router()
    .get(
      "/v1/accounts",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const url = new URL(ctx.request.url);
        const pageString = url.searchParams.get("page") ?? "1";
        const pageSizeString = url.searchParams.get("pageSize") ?? "20";
        const page = parseInt(pageString);
        const pageSize = parseInt(pageSizeString);
        const offset = (page - 1) * pageSize;
        const { result } = await appContext.db.accounts.getMany({
          limit: pageSize,
          offset: offset,
        });

        return Response.json(
          result.map(({ value, id }) => ({ ...value, id })),
        );
      },
    )
    .post(
      "/v1/accounts",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const body = await ctx.request.json();
        const apiKey = ulid();
        const timestamp = Date.now();
        const account = {
          id: body.id,
          description: body.description ?? null,
          plan: body.plan ?? null,
          apiKey: apiKey,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null,
        };
        try {
          const result = await appContext.db.accounts.add(account);
          if (!result.ok) {
            console.error("KV Add failed:", result);
            return new Response("Failed to create account", { status: 500 });
          }
        } catch (e: unknown) {
          console.error("KV Add threw:", e);
          const message = e instanceof Error ? e.message : "Unknown error";
          return new Response("Failed to create account: " + message, {
            status: 500,
          });
        }

        return Response.json(account, { status: 201 });
      },
    )
    .get(
      "/v1/accounts/:account",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const accountId = ctx.params?.pathname.groups.account;
        if (!accountId) {
          return new Response("Account ID required", { status: 400 });
        }

        const result = await appContext.db.accounts.find(accountId);
        if (!result) {
          return new Response("Account not found", { status: 404 });
        }

        return Response.json({ ...result.value, id: accountId });
      },
    )
    .put(
      "/v1/accounts/:account",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const accountId = ctx.params?.pathname.groups.account;
        if (!accountId) {
          return new Response("Account ID required", { status: 400 });
        }

        const body = await ctx.request.json();
        const result = await appContext.db.accounts.update(accountId, {
          description: body.description ?? null,
          plan: body.plan ?? null,
          updatedAt: Date.now(),
        });
        if (!result.ok) {
          return new Response("Failed to update account", { status: 500 });
        }

        return new Response(null, { status: 204 });
      },
    )
    .delete(
      "/v1/accounts/:account",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const accountId = ctx.params?.pathname.groups.account;
        if (!accountId) {
          return new Response("Account ID required", { status: 400 });
        }

        await appContext.db.accounts.delete(accountId);
        return new Response(null, { status: 204 });
      },
    )
    .post(
      "/v1/accounts/:account/rotate",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        const accountId = ctx.params?.pathname.groups.account;
        if (!accountId) {
          return new Response("Account ID required", { status: 400 });
        }

        const apiKey = ulid();
        const result = await appContext.db.accounts.update(accountId, {
          apiKey,
          updatedAt: Date.now(),
        });
        if (!result.ok) {
          return new Response("Failed to rotate account key", { status: 500 });
        }

        return new Response(null, { status: 204 });
      },
    );
