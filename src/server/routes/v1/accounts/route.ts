import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import {
  createAccountParamsSchema,
  updateAccountParamsSchema,
} from "#/server/schemas.ts";
import { LibsqlSearchStoreManager } from "#/server/search/libsql.ts";
import {
  accountsAdd,
  accountsDelete,
  accountsFind,
  accountsGetMany,
  accountsRotateApiKey,
  accountsUpdate,
} from "#/server/db/queries/accounts.sql.ts";

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

        const result = await appContext.libsqlClient.execute({
          sql: accountsGetMany,
          args: [pageSize, offset],
        });

        return Response.json(
          result.rows.map((row) => ({
            id: row.id,
            description: row.description,
            plan: row.plan,
            apiKey: row.api_key,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            deletedAt: row.deleted_at,
          })),
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

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parseResult = createAccountParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return Response.json(parseResult.error, { status: 400 });
        }
        const { id, ...data } = parseResult.data;

        const apiKey = ulid();

        const now = Date.now();
        const account = {
          id: id,
          description: data.description,
          plan: data.plan,
          apiKey: apiKey,
          createdAt: now,
          updatedAt: now,
        };

        try {
          await appContext.libsqlClient.execute({
            sql: accountsAdd,
            args: [
              id,
              data.description ?? null,
              data.plan ?? null,
              apiKey,
              now,
              now,
              null,
            ],
          });
        } catch (e: unknown) {
          console.error("SQL Insert failed:", e);
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

        const result = await appContext.libsqlClient.execute({
          sql: accountsFind,
          args: [accountId],
        });

        const row = result.rows[0];
        if (!row) {
          return new Response("Account not found", { status: 404 });
        }

        return Response.json({
          id: row.id,
          description: row.description,
          plan: row.plan,
          apiKey: row.api_key,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
        });
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

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parseResult = updateAccountParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return Response.json(parseResult.error, { status: 400 });
        }
        const data = parseResult.data;

        await appContext.libsqlClient.execute({
          sql: accountsUpdate,
          args: [
            data.description ?? null,
            data.plan ?? null,
            Date.now(),
            accountId,
          ],
        });

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

        // Cleanup search data
        const searchStore = new LibsqlSearchStoreManager({
          client: appContext.libsqlClient,
          embeddings: appContext.embeddings,
        });
        await searchStore.createTablesIfNotExists();
        await searchStore.deleteAccount(accountId);

        await appContext.libsqlClient.execute({
          sql: accountsDelete,
          args: [accountId],
        });

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

        // Security Check: Only admins or the account owner can rotate the key.
        if (!authorized.admin && authorized.account?.id !== accountId) {
          return new Response("Forbidden: Permission denied", { status: 403 });
        }

        const apiKey = ulid();
        await appContext.libsqlClient.execute({
          sql: accountsRotateApiKey,
          args: [apiKey, Date.now(), accountId],
        });

        return new Response(null, { status: 204 });
      },
    );
