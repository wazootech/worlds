import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import { createInviteParamsSchema } from "#/server/schemas.ts";
import {
  invitesAdd,
  invitesDelete,
  invitesFind,
  invitesGetMany,
  invitesUpdate,
} from "#/server/db/queries/invites.sql.ts";
import { accountsUpdate } from "#/server/db/queries/accounts.sql.ts";

export default (appContext: AppContext) =>
  new Router()
    .get(
      "/v1/invites",
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
          sql: invitesGetMany,
          args: [pageSize, offset],
        });

        return Response.json(
          result.rows.map((row) => ({
            code: row.code,
            createdAt: row.created_at,
            redeemedBy: row.redeemed_by,
            redeemedAt: row.redeemed_at,
          })),
        );
      },
    )
    .post(
      "/v1/invites",
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

        let body = {};
        try {
          body = await ctx.request.json();
        } catch {
          // Empty body is allowed, default code will be generated
        }

        const parseResult = createInviteParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return Response.json(parseResult.error, { status: 400 });
        }

        const code = parseResult.data.code ?? ulid();
        const now = Date.now();
        const invite = {
          code: code,
          createdAt: now,
          redeemedBy: null,
          redeemedAt: null,
        };

        try {
          await appContext.libsqlClient.execute({
            sql: invitesAdd,
            args: [code, now, null, null],
          });
        } catch (e: unknown) {
          console.error("SQL Insert failed:", e);
          const message = e instanceof Error ? e.message : "Unknown error";
          return new Response("Failed to create invite: " + message, {
            status: 500,
          });
        }

        return Response.json(invite, { status: 201 });
      },
    )
    .get(
      "/v1/invites/:code",
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

        const code = ctx.params?.pathname.groups.code;
        if (!code) {
          return new Response("Invite code required", { status: 400 });
        }

        const result = await appContext.libsqlClient.execute({
          sql: invitesFind,
          args: [code],
        });

        const row = result.rows[0];
        if (!row) {
          return new Response("Invite not found", { status: 404 });
        }

        return Response.json({
          code: row.code,
          createdAt: row.created_at,
          redeemedBy: row.redeemed_by,
          redeemedAt: row.redeemed_at,
        });
      },
    )
    .delete(
      "/v1/invites/:code",
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

        const code = ctx.params?.pathname.groups.code;
        if (!code) {
          return new Response("Invite code required", { status: 400 });
        }

        await appContext.libsqlClient.execute({
          sql: invitesDelete,
          args: [code],
        });

        return new Response(null, { status: 204 });
      },
    )
    .post(
      "/v1/invites/:code/redeem",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        // For redemption, we need an actual account (not just admin)
        if (!authorized.account) {
          return new Response("Account required for redemption", {
            status: 400,
          });
        }

        const code = ctx.params?.pathname.groups.code;
        if (!code) {
          return new Response("Invite code required", { status: 400 });
        }

        // Find the invite
        const inviteResult = await appContext.libsqlClient.execute({
          sql: invitesFind,
          args: [code],
        });

        const invite = inviteResult.rows[0];
        if (!invite) {
          return new Response("Invite not found", { status: 404 });
        }

        // Check if already redeemed
        if (invite.redeemed_by) {
          return new Response("Invite already redeemed", { status: 410 });
        }

        // Check if user already has a plan
        const account = authorized.account.value;
        if (account.plan && account.plan !== "shadow") {
          return new Response("Account already has a plan", { status: 409 });
        }

        const now = Date.now();

        // Update the invite
        await appContext.libsqlClient.execute({
          sql: invitesUpdate,
          args: [authorized.account.id, now, code],
        });

        // Update the account's plan to "free"
        await appContext.libsqlClient.execute({
          sql: accountsUpdate,
          args: [
            account.description ?? null,
            "free",
            now,
            authorized.account.id,
          ],
        });

        return Response.json({
          message: "Invite redeemed successfully",
          plan: "free",
        });
      },
    );
