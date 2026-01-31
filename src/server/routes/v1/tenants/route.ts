import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import { paginationParamsSchema } from "#/sdk/schema.ts";
import {
  createTenantParamsSchema,
  tenantRecordSchema,
  updateTenantParamsSchema,
} from "#/sdk/internal/schema.ts";
import { LibsqlSearchStoreManager } from "#/server/search/libsql.ts";
import {
  tenantsAdd,
  tenantsDelete,
  tenantsFind,
  tenantsGetMany,
  tenantsRotateApiKey,
  tenantsUpdate,
} from "#/server/db/resources/tenants/queries.sql.ts";
import {
  tenantTableInsertSchema,
  tenantTableSchema,
  tenantTableUpdateSchema,
} from "../../../db/resources/tenants/schema.ts";
import { ErrorResponse } from "#/server/errors.ts";

export default (appContext: AppContext) =>
  new Router()
    .get(
      "/v1/tenants",
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
              paginationResult.error.issues.map((e) => e.message).join(", "),
          );
        }

        const { page, pageSize } = paginationResult.data;
        const offset = (page - 1) * pageSize;

        const result = await appContext.libsqlClient.execute({
          sql: tenantsGetMany,
          args: [pageSize, offset],
        });

        // Validate each SQL result row
        const validatedRows = result.rows.map((row) => {
          const validated = tenantTableSchema.parse({
            id: row.id,
            label: row.label,
            description: row.description,
            plan: row.plan,
            api_key: row.api_key,
            created_at: row.created_at,
            updated_at: row.updated_at,
            deleted_at: row.deleted_at,
          });

          return tenantRecordSchema.parse({
            id: validated.id,
            label: validated.label,
            description: validated.description,
            plan: validated.plan,
            apiKey: validated.api_key,
            createdAt: validated.created_at,
            updatedAt: validated.updated_at,
            deletedAt: validated.deleted_at,
          });
        });

        return Response.json(validatedRows);
      },
    )
    .post(
      "/v1/tenants",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        if (!authorized.admin) {
          return ErrorResponse.Forbidden("Forbidden: Admin access required");
        }

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }

        const parseResult = createTenantParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid parameters: " +
              parseResult.error.issues.map((e) => e.message).join(", "),
          );
        }
        const { id, ...data } = parseResult.data;

        const apiKey = ulid();

        const now = Date.now();
        const tenant = tenantTableInsertSchema.parse({
          id,
          label: data.label ?? null,
          description: data.description ?? null,
          plan: data.plan ?? null,
          api_key: apiKey,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        try {
          await appContext.libsqlClient.execute({
            sql: tenantsAdd,
            args: [
              tenant.id,
              tenant.label ?? null,
              tenant.description ?? null,
              tenant.plan ?? null,
              tenant.api_key,
              tenant.created_at,
              tenant.updated_at,
              tenant.deleted_at ?? null,
            ],
          });
        } catch (e: unknown) {
          console.error("SQL Insert failed:", e);
          const message = e instanceof Error ? e.message : "Unknown error";
          return ErrorResponse.InternalServerError(
            "Failed to create tenant: " + message,
          );
        }

        const record = tenantRecordSchema.parse({
          id: tenant.id,
          label: tenant.label,
          description: tenant.description,
          plan: tenant.plan,
          apiKey: tenant.api_key,
          createdAt: tenant.created_at,
          updatedAt: tenant.updated_at,
          deletedAt: tenant.deleted_at,
        });

        return Response.json(record, { status: 201 });
      },
    )
    .get(
      "/v1/tenants/:tenant",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        if (!authorized.admin) {
          return ErrorResponse.Forbidden("Forbidden: Admin access required");
        }

        const tenantId = ctx.params?.pathname.groups.tenant;
        if (!tenantId) {
          return ErrorResponse.BadRequest("Tenant ID required");
        }

        const result = await appContext.libsqlClient.execute({
          sql: tenantsFind,
          args: [tenantId],
        });

        const row = result.rows[0];
        if (!row) {
          return ErrorResponse.NotFound("Tenant not found");
        }

        // Validate SQL result
        const validated = tenantTableSchema.parse({
          id: row.id,
          label: row.label,
          description: row.description,
          plan: row.plan,
          api_key: row.api_key,
          created_at: row.created_at,
          updated_at: row.updated_at,
          deleted_at: row.deleted_at,
        });

        const record = tenantRecordSchema.parse({
          id: validated.id,
          label: validated.label,
          description: validated.description,
          plan: validated.plan,
          apiKey: validated.api_key,
          createdAt: validated.created_at,
          updatedAt: validated.updated_at,
          deletedAt: validated.deleted_at,
        });

        return Response.json(record);
      },
    )
    .put(
      "/v1/tenants/:tenant",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        if (!authorized.admin) {
          return ErrorResponse.Forbidden("Forbidden: Admin access required");
        }

        const tenantId = ctx.params?.pathname.groups.tenant;
        if (!tenantId) {
          return ErrorResponse.BadRequest("Tenant ID required");
        }

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }

        const parseResult = updateTenantParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid parameters: " +
              parseResult.error.issues.map((e) => e.message).join(", "),
          );
        }
        const data = parseResult.data;

        const updateNow = Date.now();
        const tenantUpdate = tenantTableUpdateSchema.parse({
          label: data.label ?? undefined,
          description: data.description ?? undefined,
          plan: data.plan ?? undefined,
          updated_at: updateNow,
        });

        await appContext.libsqlClient.execute({
          sql: tenantsUpdate,
          args: [
            tenantUpdate.label ?? null,
            tenantUpdate.description ?? null,
            tenantUpdate.plan ?? null,
            tenantUpdate.updated_at ?? updateNow,
            tenantId,
          ],
        });

        return new Response(null, { status: 204 });
      },
    )
    .delete(
      "/v1/tenants/:tenant",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        if (!authorized.admin) {
          return ErrorResponse.Forbidden("Forbidden: Admin access required");
        }

        const tenantId = ctx.params?.pathname.groups.tenant;
        if (!tenantId) {
          return ErrorResponse.BadRequest("Tenant ID required");
        }

        // Cleanup search data
        const searchStore = new LibsqlSearchStoreManager({
          client: appContext.libsqlClient,
          embeddings: appContext.embeddings,
        });
        await searchStore.createTablesIfNotExists();
        await searchStore.deleteTenant(tenantId);

        await appContext.libsqlClient.execute({
          sql: tenantsDelete,
          args: [tenantId],
        });

        return new Response(null, { status: 204 });
      },
    )
    .post(
      "/v1/tenants/:tenant/rotate",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const tenantId = ctx.params?.pathname.groups.tenant;
        if (!tenantId) {
          return ErrorResponse.BadRequest("Tenant ID required");
        }

        // Security Check: Only admins or the tenant owner can rotate the key.
        if (!authorized.admin && authorized.tenant?.id !== tenantId) {
          return ErrorResponse.Forbidden("Forbidden: Permission denied");
        }

        const apiKey = ulid();
        await appContext.libsqlClient.execute({
          sql: tenantsRotateApiKey,
          args: [apiKey, Date.now(), tenantId],
        });

        return new Response(null, { status: 204 });
      },
    );
