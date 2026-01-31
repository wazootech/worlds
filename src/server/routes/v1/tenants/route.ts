import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import {
  createTenantParamsSchema,
  updateTenantParamsSchema,
} from "#/server/schemas.ts";
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
  tenantTableUpdateSchema,
} from "../../../db/resources/tenants/schema.ts";

export default (appContext: AppContext) =>
  new Router()
    .get(
      "/v1/tenants",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
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
          sql: tenantsGetMany,
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
      "/v1/tenants",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
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

        const parseResult = createTenantParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return Response.json(parseResult.error, { status: 400 });
        }
        const { id, ...data } = parseResult.data;

        const apiKey = ulid();

        const now = Date.now();
        const tenant = tenantTableInsertSchema.parse({
          id,
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
          return new Response("Failed to create tenant: " + message, {
            status: 500,
          });
        }

        return Response.json({
          id: tenant.id,
          description: tenant.description,
          plan: tenant.plan,
          apiKey: tenant.api_key,
          createdAt: tenant.created_at,
          updatedAt: tenant.updated_at,
          deletedAt: tenant.deleted_at,
        }, { status: 201 });
      },
    )
    .get(
      "/v1/tenants/:tenant",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const tenantId = ctx.params?.pathname.groups.tenant;
        if (!tenantId) {
          return new Response("Tenant ID required", { status: 400 });
        }

        const result = await appContext.libsqlClient.execute({
          sql: tenantsFind,
          args: [tenantId],
        });

        const row = result.rows[0];
        if (!row) {
          return new Response("Tenant not found", { status: 404 });
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
      "/v1/tenants/:tenant",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const tenantId = ctx.params?.pathname.groups.tenant;
        if (!tenantId) {
          return new Response("Tenant ID required", { status: 400 });
        }

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parseResult = updateTenantParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return Response.json(parseResult.error, { status: 400 });
        }
        const data = parseResult.data;

        const updateNow = Date.now();
        const tenantUpdate = tenantTableUpdateSchema.parse({
          description: data.description ?? undefined,
          plan: data.plan ?? undefined,
          updated_at: updateNow,
        });

        await appContext.libsqlClient.execute({
          sql: tenantsUpdate,
          args: [
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
          return new Response("Unauthorized", { status: 401 });
        }

        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const tenantId = ctx.params?.pathname.groups.tenant;
        if (!tenantId) {
          return new Response("Tenant ID required", { status: 400 });
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
          return new Response("Unauthorized", { status: 401 });
        }

        const tenantId = ctx.params?.pathname.groups.tenant;
        if (!tenantId) {
          return new Response("Tenant ID required", { status: 400 });
        }

        // Security Check: Only admins or the tenant owner can rotate the key.
        if (!authorized.admin && authorized.tenant?.id !== tenantId) {
          return new Response("Forbidden: Permission denied", { status: 403 });
        }

        const apiKey = ulid();
        await appContext.libsqlClient.execute({
          sql: tenantsRotateApiKey,
          args: [apiKey, Date.now(), tenantId],
        });

        return new Response(null, { status: 204 });
      },
    );
