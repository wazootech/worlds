import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid/ulid";
import { authorizeRequest } from "#/middleware/auth.ts";
import { checkRateLimit } from "#/middleware/rate-limit.ts";
import type { ServerContext } from "#/context.ts";
import { paginationParamsSchema } from "@wazoo/sdk";
import { createInviteParamsSchema, inviteSchema } from "@wazoo/sdk";
import { ErrorResponse } from "../../../lib/errors/errors.ts";
import { InvitesService } from "#/lib/database/tables/invites/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";
import type { InviteTable } from "#/lib/database/tables/invites/schema.ts";
import { inviteTableInsertSchema } from "#/lib/database/tables/invites/schema.ts";

export default (appContext: ServerContext) =>
  new Router()
    .get(
      "/v1/invites",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "invites_list",
        );
        if (rateLimitRes) return rateLimitRes;

        const url = new URL(ctx.request.url);
        const pageString = url.searchParams.get("page") ?? "1";
        const pageSizeString = url.searchParams.get("pageSize") ?? "20";

        // Validate pagination parameters
        const paginationResult = paginationParamsSchema.safeParse({
          page: parseInt(pageString),
          pageSize: parseInt(pageSizeString),
        });

        if (!paginationResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid pagination parameters: " +
              paginationResult.error.issues.map((e: { message: string }) =>
                e.message
              ).join(", "),
          );
        }

        const { page, pageSize } = paginationResult.data;
        const offset = (page - 1) * pageSize;

        const invitesService = new InvitesService(appContext.libsql.database);
        const invites = await invitesService.getMany(pageSize, offset);

        // Map to SDK record and validate
        const validatedRows = invites.map((invite: InviteTable) => {
          return inviteSchema.parse({
            code: invite.code,
            createdAt: invite.created_at,
            redeemedBy: invite.redeemed_by,
            redeemedAt: invite.redeemed_at,
          });
        });

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "invites_list",
            quantity: 1,
          });
        }
        return Response.json(validatedRows);
      },
    )
    .post(
      "/v1/invites",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "invites_create",
        );
        if (rateLimitRes) return rateLimitRes;

        let body = {};
        try {
          body = await ctx.request.json();
        } catch {
          // Empty body is allowed, default code will be generated
        }

        const parseResult = createInviteParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid parameters: " +
              parseResult.error.issues.map((e: { message: string }) =>
                e.message
              ).join(", "),
          );
        }

        const code = parseResult.data.code ?? ulid();
        const invitesService = new InvitesService(appContext.libsql.database);
        const now = Date.now();
        const invite = inviteTableInsertSchema.parse({
          code: code,
          created_at: now,
          redeemed_by: null,
          redeemed_at: null,
        });

        await invitesService.add(invite);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "invites_create",
            quantity: 1,
          });
        }
        const record = inviteSchema.parse({
          code: invite.code,
          createdAt: invite.created_at,
          redeemedBy: invite.redeemed_by,
          redeemedAt: invite.redeemed_at,
        });

        return Response.json(record, { status: 201 });
      },
    )
    .get(
      "/v1/invites/:code",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "invites_get",
        );
        if (rateLimitRes) return rateLimitRes;

        const code = ctx.params?.pathname.groups.code;
        if (!code) {
          return ErrorResponse.BadRequest("Invite code required");
        }

        const invitesService = new InvitesService(appContext.libsql.database);
        const invite = await invitesService.find(code);

        if (!invite) {
          return ErrorResponse.NotFound("Invite not found");
        }

        const record = inviteSchema.parse({
          code: invite.code,
          createdAt: invite.created_at,
          redeemedBy: invite.redeemed_by,
          redeemedAt: invite.redeemed_at,
        });

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "invites_get",
            quantity: 1,
          });
        }
        return Response.json(record);
      },
    )
    .delete(
      "/v1/invites/:code",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "invites_delete",
        );
        if (rateLimitRes) return rateLimitRes;

        const code = ctx.params?.pathname.groups.code;
        if (!code) {
          return ErrorResponse.BadRequest("Invite code required");
        }

        const invitesService = new InvitesService(appContext.libsql.database);
        await invitesService.delete(code);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "invites_delete",
            quantity: 1,
          });
        }
        return new Response(null, { status: 204 });
      },
    );
