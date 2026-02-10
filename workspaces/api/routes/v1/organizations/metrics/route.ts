import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/middleware/auth.ts";
import { checkRateLimit } from "#/middleware/rate-limit.ts";
import type { AppContext } from "#/context.ts";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { MetricsService } from "#/lib/database/tables/metrics/service.ts";
import { OrganizationsService } from "#/lib/database/tables/organizations/service.ts";
import { metricListParamsSchema } from "@wazoo/sdk";

export default (appContext: AppContext) => {
  return new Router().get(
    "/v1/organizations/:organization/metrics",
    async (ctx) => {
      const organizationId = ctx.params?.pathname.groups.organization;
      if (!organizationId) {
        return ErrorResponse.BadRequest("Organization ID required");
      }

      const authorized = await authorizeRequest(appContext, ctx.request);
      if (!authorized.admin && !authorized.serviceAccountId) {
        return ErrorResponse.Unauthorized();
      }

      // Check access: Admin can acccess any, Service Account only its own org (via relationship)
      if (!authorized.admin) {
        if (authorized.organizationId !== organizationId) {
          return ErrorResponse.Forbidden();
        }
      }

      // Verify organization exists
      const orgService = new OrganizationsService(appContext.database);
      const org = await orgService.find(organizationId);
      if (!org) {
        return ErrorResponse.NotFound("Organization not found");
      }

      const rateLimitRes = await checkRateLimit(
        appContext,
        authorized,
        "metrics_query",
      );
      if (rateLimitRes) return rateLimitRes;

      const url = new URL(ctx.request.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());

      // Parse and validate query parameters
      const parseResult = metricListParamsSchema.safeParse({
        ...queryParams,
        page: queryParams.page ? parseInt(queryParams.page) : undefined,
        pageSize: queryParams.pageSize
          ? parseInt(queryParams.pageSize)
          : undefined,
        start: queryParams.start ? parseInt(queryParams.start) : undefined,
        end: queryParams.end ? parseInt(queryParams.end) : undefined,
      });

      if (!parseResult.success) {
        return ErrorResponse.BadRequest(
          "Invalid query parameters: " +
            parseResult.error.issues.map((e: { message: string }) => e.message)
              .join(", "),
        );
      }

      const params = parseResult.data;
      const metricsService = new MetricsService(appContext.database);

      if (authorized.serviceAccountId) {
        await metricsService.meter({
          service_account_id: authorized.serviceAccountId,
          feature_id: "metrics_query",
          quantity: 1,
        });
      }

      const metrics = await metricsService.list(organizationId, {
        limit: params.pageSize,
        offset: params.page && params.pageSize
          ? (params.page - 1) * params.pageSize
          : undefined,
        feature_id: params.featureId,
        service_account_id: params.serviceAccountId,
        start: params.start,
        end: params.end,
      });
      return Response.json(metrics);
    },
  );
};
