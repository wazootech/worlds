import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import { paginationParamsSchema } from "#/sdk/utils.ts";
import {
  createInviteParamsSchema,
  inviteRecordSchema,
} from "#/sdk/invites/schema.ts";
import {
  invitesAdd,
  invitesDelete,
  invitesFind,
  invitesGetMany,
  invitesUpdate,
} from "#/server/db/resources/invites/queries.sql.ts";
import { tenantsUpdate } from "#/server/db/resources/tenants/queries.sql.ts";
import {
  inviteTableInsertSchema,
  inviteTableSchema,
  inviteTableUpdateSchema,
} from "#/server/db/resources/invites/schema.ts";
import {
  tenantTableSchema,
  tenantTableUpdateSchema,
} from "#/server/db/resources/tenants/schema.ts";
import { ErrorResponse } from "#/server/errors.ts";

export default (appContext: AppContext) =>
  new Router()
    .get(
      "/v1/invites",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        if (!authorized.admin) {
          return ErrorResponse.Forbidden("Forbidden: Admin access required");
        }

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

        const result = await appContext.libsqlClient.execute({
          sql: invitesGetMany,
          args: [pageSize, offset],
        });

        // Validate each SQL result row
        const validatedRows = result.rows.map((row) => {
          const validated = inviteTableSchema.parse({
            code: row.code,
            created_at: row.created_at,
            redeemed_by: row.redeemed_by,
            redeemed_at: row.redeemed_at,
          });

          return inviteRecordSchema.parse({
            code: validated.code,
            createdAt: validated.created_at,
            redeemedBy: validated.redeemed_by,
            redeemedAt: validated.redeemed_at,
          });
        });

        return Response.json(validatedRows);
      },
    )
    .post(
      "/v1/invites",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        if (!authorized.admin) {
          return ErrorResponse.Forbidden("Forbidden: Admin access required");
        }

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
        const now = Date.now();
        const invite = inviteTableInsertSchema.parse({
          code: code,
          created_at: now,
          redeemed_by: null,
          redeemed_at: null,
        });

        try {
          await appContext.libsqlClient.execute({
            sql: invitesAdd,
            args: [
              invite.code,
              invite.created_at,
              invite.redeemed_by ?? null,
              invite.redeemed_at ?? null,
            ],
          });
        } catch (e: unknown) {
          console.error("SQL Insert failed:", e);
          const message = e instanceof Error ? e.message : "Unknown error";
          return ErrorResponse.InternalServerError(
            "Failed to create invite: " + message,
          );
        }

        const record = inviteRecordSchema.parse({
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
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        if (!authorized.admin) {
          return ErrorResponse.Forbidden("Forbidden: Admin access required");
        }

        const code = ctx.params?.pathname.groups.code;
        if (!code) {
          return ErrorResponse.BadRequest("Invite code required");
        }

        const result = await appContext.libsqlClient.execute({
          sql: invitesFind,
          args: [code],
        });

        const row = result.rows[0];
        if (!row) {
          return ErrorResponse.NotFound("Invite not found");
        }

        // Validate SQL result
        const validated = inviteTableSchema.parse({
          code: row.code,
          created_at: row.created_at,
          redeemed_by: row.redeemed_by,
          redeemed_at: row.redeemed_at,
        });

        const record = inviteRecordSchema.parse({
          code: validated.code,
          createdAt: validated.created_at,
          redeemedBy: validated.redeemed_by,
          redeemedAt: validated.redeemed_at,
        });

        return Response.json(record);
      },
    )
    .delete(
      "/v1/invites/:code",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        if (!authorized.admin) {
          return ErrorResponse.Forbidden("Forbidden: Admin access required");
        }

        const code = ctx.params?.pathname.groups.code;
        if (!code) {
          return ErrorResponse.BadRequest("Invite code required");
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
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        // For redemption, we need an actual tenant (not just admin)
        if (!authorized.tenant) {
          return ErrorResponse.BadRequest("Tenant required for redemption");
        }

        const code = ctx.params?.pathname.groups.code;
        if (!code) {
          return ErrorResponse.BadRequest("Invite code required");
        }

        // Find the invite
        const inviteResult = await appContext.libsqlClient.execute({
          sql: invitesFind,
          args: [code],
        });

        const rawInvite = inviteResult.rows[0];
        if (!rawInvite) {
          return ErrorResponse.NotFound("Invite not found");
        }

        // Validate SQL result
        const invite = inviteTableSchema.parse({
          code: rawInvite.code,
          created_at: rawInvite.created_at,
          redeemed_by: rawInvite.redeemed_by,
          redeemed_at: rawInvite.redeemed_at,
        });

        // Check if already redeemed
        if (invite.redeemed_by) {
          return new ErrorResponse("Invite already redeemed", 410);
        }

        // Validate tenant data before business logic checks
        const tenant = tenantTableSchema.parse({
          id: authorized.tenant.id,
          label: authorized.tenant.label,
          description: authorized.tenant.description,
          plan: authorized.tenant.plan,
          api_key: authorized.tenant.api_key,
          created_at: authorized.tenant.created_at,
          updated_at: authorized.tenant.updated_at,
          deleted_at: authorized.tenant.deleted_at,
        });

        if (tenant.plan && tenant.plan !== "shadow") {
          return ErrorResponse.Conflict("Tenant already has a plan");
        }

        const now = Date.now();

        try {
          // Update the invite
          const inviteUpdate = inviteTableUpdateSchema.parse({
            redeemed_by: authorized.tenant.id,
            redeemed_at: now,
          });
          await appContext.libsqlClient.execute({
            sql: invitesUpdate,
            args: [
              inviteUpdate.redeemed_by ?? null,
              inviteUpdate.redeemed_at ?? null,
              code,
            ],
          });

          // Update the tenant's plan to "free"
          // Update the tenant's plan to "free"
          const tenantUpdate = tenantTableUpdateSchema.parse({
            label: tenant.label ?? null,
            description: tenant.description ?? null,
            plan: "free",
            updated_at: now,
          });
          await appContext.libsqlClient.execute({
            sql: tenantsUpdate,
            args: [
              tenantUpdate.label ?? null,
              tenantUpdate.description ?? null,
              tenantUpdate.plan ?? null,
              tenantUpdate.updated_at ?? now,
              authorized.tenant.id,
            ],
          });
        } catch (e: unknown) {
          console.error("Redemption failed:", e);
          const message = e instanceof Error ? e.message : "Unknown error";
          return ErrorResponse.InternalServerError(
            "Failed to redeem invite: " + message,
          );
        }

        return Response.json({
          message: "Invite redeemed successfully",
          plan: "free",
        });
      },
    );
