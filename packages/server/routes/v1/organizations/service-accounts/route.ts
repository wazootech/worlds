import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid/ulid";
import { authorizeRequest } from "#/middleware/auth.ts";
import { checkRateLimit } from "#/middleware/rate-limit.ts";
import type { ServerContext } from "#/context.ts";
import { paginationParamsSchema } from "@wazoo/sdk";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { ServiceAccountsService } from "#/lib/database/tables/service-accounts/service.ts";
import type { ServiceAccountTable } from "#/lib/database/tables/service-accounts/schema.ts";
import {
  createServiceAccountSchema,
  serviceAccountTableInsertSchema,
  updateServiceAccountSchema,
} from "#/lib/database/tables/service-accounts/schema.ts";
import { OrganizationsService } from "#/lib/database/tables/organizations/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";

function requireOrgAccess(
  authorized: { admin: boolean; serviceAccountId?: string },
  organizationId: string,
  serviceAccountsService: ServiceAccountsService,
): Promise<boolean> {
  if (authorized.admin) return Promise.resolve(true);
  if (!authorized.serviceAccountId) return Promise.resolve(false);
  return serviceAccountsService.getById(authorized.serviceAccountId).then(
    (account) => account?.organization_id === organizationId,
  );
}

export default (appContext: ServerContext) => {
  return new Router()
    .get(
      "/v1/organizations/:organization/service-accounts",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.serviceAccountId) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "service_accounts_list",
        );
        if (rateLimitRes) return rateLimitRes;

        const organizationId = ctx.params?.pathname.groups.organization;
        if (!organizationId) {
          return ErrorResponse.BadRequest("Organization ID required");
        }

        const serviceAccountsService = new ServiceAccountsService(
          appContext.libsql.database,
        );
        const allowed = await requireOrgAccess(
          authorized,
          organizationId,
          serviceAccountsService,
        );
        if (!allowed) {
          return ErrorResponse.Forbidden();
        }

        const orgService = new OrganizationsService(
          appContext.libsql.database,
        );
        const org = await orgService.find(organizationId);
        if (!org) {
          return ErrorResponse.NotFound("Organization not found");
        }

        const url = new URL(ctx.request.url);
        const pageString = url.searchParams.get("page") ?? "1";
        const pageSizeString = url.searchParams.get("pageSize") ?? "20";
        const paginationResult = paginationParamsSchema.safeParse({
          page: parseInt(pageString),
          pageSize: parseInt(pageSizeString),
        });
        if (!paginationResult.success) {
          return ErrorResponse.BadRequest("Invalid pagination parameters");
        }
        const { page, pageSize } = paginationResult.data;
        const offset = (page - 1) * pageSize;

        const all = await serviceAccountsService.listByOrganizationId(
          organizationId,
        );
        const rows = all.slice(offset, offset + pageSize);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "service_accounts_list",
            quantity: 1,
          });
        }

        return Response.json(
          rows.map((r: ServiceAccountTable) => ({
            id: r.id,
            organizationId: r.organization_id,
            label: r.label,
            description: r.description,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          })),
        );
      },
    )
    .post(
      "/v1/organizations/:organization/service-accounts",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.serviceAccountId) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "service_accounts_create",
        );
        if (rateLimitRes) return rateLimitRes;

        const organizationId = ctx.params?.pathname.groups.organization;
        if (!organizationId) {
          return ErrorResponse.BadRequest("Organization ID required");
        }

        const serviceAccountsService = new ServiceAccountsService(
          appContext.libsql.database,
        );
        const allowed = await requireOrgAccess(
          authorized,
          organizationId,
          serviceAccountsService,
        );
        if (!allowed) {
          return ErrorResponse.Forbidden();
        }

        const orgService = new OrganizationsService(
          appContext.libsql.database,
        );
        const org = await orgService.find(organizationId);
        if (!org) {
          return ErrorResponse.NotFound("Organization not found");
        }

        let body: unknown;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }
        const parseResult = createServiceAccountSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest("Invalid parameters");
        }
        const data = parseResult.data;
        const id = data.id ?? ulid();
        const apiKey = ulid() + ulid();
        const now = Date.now();
        const insert = serviceAccountTableInsertSchema.parse({
          id,
          organization_id: organizationId,
          api_key: apiKey,
          label: data.label ?? null,
          description: data.description ?? null,
          created_at: now,
          updated_at: now,
        });
        await serviceAccountsService.add(insert);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "service_accounts_create",
            quantity: 1,
          });
        }

        return Response.json(
          {
            id: insert.id,
            organizationId: insert.organization_id,
            apiKey: insert.api_key,
            label: insert.label,
            description: insert.description,
            createdAt: insert.created_at,
            updatedAt: insert.updated_at,
          },
          { status: 201 },
        );
      },
    )
    .get(
      "/v1/organizations/:organization/service-accounts/:account",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.serviceAccountId) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "service_accounts_get",
        );
        if (rateLimitRes) return rateLimitRes;

        const organizationId = ctx.params?.pathname.groups.organization;
        const accountId = ctx.params?.pathname.groups.account;
        if (!organizationId || !accountId) {
          return ErrorResponse.BadRequest(
            "Organization and account ID required",
          );
        }

        const serviceAccountsService = new ServiceAccountsService(
          appContext.libsql.database,
        );
        const allowed = await requireOrgAccess(
          authorized,
          organizationId,
          serviceAccountsService,
        );
        if (!allowed) {
          return ErrorResponse.Forbidden();
        }

        const account = await serviceAccountsService.getById(accountId);
        if (!account || account.organization_id !== organizationId) {
          return ErrorResponse.NotFound("Service account not found");
        }

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "service_accounts_get",
            quantity: 1,
          });
        }

        return Response.json({
          id: account.id,
          organizationId: account.organization_id,
          label: account.label,
          description: account.description,
          createdAt: account.created_at,
          updatedAt: account.updated_at,
        });
      },
    )
    .put(
      "/v1/organizations/:organization/service-accounts/:account",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.serviceAccountId) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "service_accounts_update",
        );
        if (rateLimitRes) return rateLimitRes;

        const organizationId = ctx.params?.pathname.groups.organization;
        const accountId = ctx.params?.pathname.groups.account;
        if (!organizationId || !accountId) {
          return ErrorResponse.BadRequest(
            "Organization and account ID required",
          );
        }

        const serviceAccountsService = new ServiceAccountsService(
          appContext.libsql.database,
        );
        const allowed = await requireOrgAccess(
          authorized,
          organizationId,
          serviceAccountsService,
        );
        if (!allowed) {
          return ErrorResponse.Forbidden();
        }

        const account = await serviceAccountsService.getById(accountId);
        if (!account || account.organization_id !== organizationId) {
          return ErrorResponse.NotFound("Service account not found");
        }

        let body: unknown;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }
        const update = updateServiceAccountSchema.safeParse(body);
        if (!update.success) {
          return ErrorResponse.BadRequest("Invalid parameters");
        }
        const now = Date.now();
        await serviceAccountsService.update(accountId, {
          label: update.data.label !== undefined
            ? update.data.label
            : account.label,
          description: update.data.description !== undefined
            ? update.data.description
            : account.description,
          updated_at: now,
        });

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "service_accounts_update",
            quantity: 1,
          });
        }

        return new Response(null, { status: 204 });
      },
    )
    .delete(
      "/v1/organizations/:organization/service-accounts/:account",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.serviceAccountId) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "service_accounts_delete",
        );
        if (rateLimitRes) return rateLimitRes;

        const organizationId = ctx.params?.pathname.groups.organization;
        const accountId = ctx.params?.pathname.groups.account;
        if (!organizationId || !accountId) {
          return ErrorResponse.BadRequest(
            "Organization and account ID required",
          );
        }

        const serviceAccountsService = new ServiceAccountsService(
          appContext.libsql.database,
        );
        const allowed = await requireOrgAccess(
          authorized,
          organizationId,
          serviceAccountsService,
        );
        if (!allowed) {
          return ErrorResponse.Forbidden();
        }

        const account = await serviceAccountsService.getById(accountId);
        if (!account || account.organization_id !== organizationId) {
          return ErrorResponse.NotFound("Service account not found");
        }

        await serviceAccountsService.remove(accountId);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(
            appContext.libsql.database,
          );
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "service_accounts_delete",
            quantity: 1,
          });
        }

        return new Response(null, { status: 204 });
      },
    );
};
