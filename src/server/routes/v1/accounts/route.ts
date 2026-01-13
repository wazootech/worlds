import { Router } from "@fartlabs/rt";
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

        return Response.json(result.map(({ value }) => value));
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
        const apiKey = crypto.randomUUID();
        const timestamp = Date.now();
        const result = await appContext.db.accounts.add({
          id: body.id,
          description: body.description,
          planType: body.planType,
          apiKey: apiKey,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null,
        });
        if (!result.ok) {
          return new Response("Failed to create account", { status: 500 });
        }

        return Response.json(null, { status: 201 });
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

        return Response.json(result.value);
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
          description: body.description,
          planType: body.planType,
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

        const apiKey = crypto.randomUUID();
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
