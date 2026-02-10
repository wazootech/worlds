import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import { checkRateLimit } from "#/middleware/rate-limit.ts";
import type { AppContext } from "#/context.ts";
import {
  createOrganizationParamsSchema,
  organizationSchema,
  paginationParamsSchema,
  updateOrganizationParamsSchema,
} from "@wazoo/sdk";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { OrganizationsService } from "#/lib/database/tables/organizations/service.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";
import type { OrganizationRow } from "#/lib/database/tables/organizations/schema.ts";
import {
  organizationTableInsertSchema,
  organizationTableUpdateSchema,
} from "#/lib/database/tables/organizations/schema.ts";

export default (appContext: AppContext) => {
  return new Router()
    .get(
      "/v1/organizations",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "organizations_list",
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

        const organizationsService = new OrganizationsService(
          appContext.database,
        );
        const organizations = await organizationsService.getMany(
          pageSize,
          offset,
        );

        // Map to SDK record and validate
        const validatedRows = organizations.map((org: OrganizationRow) => {
          return organizationSchema.parse({
            id: org.id,
            label: org.label,
            description: org.description,
            plan: org.plan,
            createdAt: org.created_at,
            updatedAt: org.updated_at,
            deletedAt: org.deleted_at,
          });
        });

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(appContext.database);
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "organizations_list",
            quantity: 1,
          });
        }
        return Response.json(validatedRows);
      },
    )
    .post(
      "/v1/organizations",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "organizations_create",
        );
        if (rateLimitRes) return rateLimitRes;

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }

        const parseResult = createOrganizationParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid parameters: " +
              parseResult.error.issues.map((e: { message: string }) =>
                e.message
              ).join(", "),
          );
        }
        const { id, ...data } = parseResult.data;

        const organizationsService = new OrganizationsService(
          appContext.database,
        );
        const now = Date.now();
        const organization = organizationTableInsertSchema.parse({
          id,
          label: data.label ?? null,
          description: data.description ?? null,
          plan: data.plan ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        await organizationsService.add(organization);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(appContext.database);
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "organizations_create",
            quantity: 1,
          });
        }
        const record = organizationSchema.parse({
          id: organization.id,
          label: organization.label,
          description: organization.description,
          plan: organization.plan,
          createdAt: organization.created_at,
          updatedAt: organization.updated_at,
          deletedAt: organization.deleted_at,
        });

        return Response.json(record, { status: 201 });
      },
    )
    .get(
      "/v1/organizations/:organization",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin && !authorized.organizationId) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "organizations_get",
        );
        if (rateLimitRes) return rateLimitRes;

        const organizationId = ctx.params?.pathname.groups.organization;
        if (!organizationId) {
          return ErrorResponse.BadRequest("Organization ID required");
        }

        const organizationsService = new OrganizationsService(
          appContext.database,
        );
        const organization = await organizationsService.find(organizationId);

        if (!organization) {
          return ErrorResponse.NotFound("Organization not found");
        }

        if (
          !authorized.admin &&
          authorized.organizationId !== organization.id
        ) {
          return ErrorResponse.Forbidden();
        }

        const record = organizationSchema.parse({
          id: organization.id,
          label: organization.label,
          description: organization.description,
          plan: organization.plan,
          createdAt: organization.created_at,
          updatedAt: organization.updated_at,
          deletedAt: organization.deleted_at,
        });

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(appContext.database);
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "organizations_get",
            quantity: 1,
          });
        }
        return Response.json(record);
      },
    )
    .put(
      "/v1/organizations/:organization",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "organizations_update",
        );
        if (rateLimitRes) return rateLimitRes;

        const organizationId = ctx.params?.pathname.groups.organization;
        if (!organizationId) {
          return ErrorResponse.BadRequest("Organization ID required");
        }

        let body;
        try {
          body = await ctx.request.json();
        } catch {
          return ErrorResponse.BadRequest("Invalid JSON");
        }

        const parseResult = updateOrganizationParamsSchema.safeParse(body);
        if (!parseResult.success) {
          return ErrorResponse.BadRequest(
            "Invalid parameters: " +
              parseResult.error.issues.map((e: { message: string }) =>
                e.message
              ).join(", "),
          );
        }
        const data = parseResult.data;

        const updateNow = Date.now();
        const organizationUpdate = organizationTableUpdateSchema.parse({
          label: data.label ?? undefined,
          description: data.description ?? undefined,
          plan: data.plan ?? undefined,
          updated_at: updateNow,
        });

        const organizationsService = new OrganizationsService(
          appContext.database,
        );
        await organizationsService.update(organizationId, organizationUpdate);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(appContext.database);
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "organizations_update",
            quantity: 1,
          });
        }
        return new Response(null, { status: 204 });
      },
    )
    .delete(
      "/v1/organizations/:organization",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }
        const rateLimitRes = await checkRateLimit(
          appContext,
          authorized,
          "organizations_delete",
        );
        if (rateLimitRes) return rateLimitRes;

        const organizationId = ctx.params?.pathname.groups.organization;
        if (!organizationId) {
          return ErrorResponse.BadRequest("Organization ID required");
        }

        // Cleanup search data
        // const searchStore = new LibsqlSearchStoreManager({
        //   client: appContext.libsqlClient,
        //   embeddings: appContext.embeddings,
        // });
        // await searchStore.createTablesIfNotExists();
        // await searchStore.deleteOrganization(organizationId);

        const organizationsService = new OrganizationsService(
          appContext.database,
        );
        await organizationsService.delete(organizationId);

        if (authorized.serviceAccountId) {
          const metricsService = new MetricsService(appContext.database);
          metricsService.meter({
            service_account_id: authorized.serviceAccountId,
            feature_id: "organizations_delete",
            quantity: 1,
          });
        }
        return new Response(null, { status: 204 });
      },
    );
};
