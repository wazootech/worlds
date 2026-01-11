import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import { z } from "zod";
import type { AppContext } from "#/server/app-context.ts";

export default (appContext: AppContext) =>
  new Router()
    .get(
      "/v1/plans",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { result } = await appContext.db.plans.getMany();
        return Response.json(result.map(({ value }) => value));
      },
    )
    .get(
      "/v1/plans/:plan",
      async (ctx) => {
        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.account && !authorized.admin) {
          return new Response("Unauthorized", { status: 401 });
        }

        const planTypeString = ctx.params?.pathname.groups.plan;
        if (!planTypeString) {
          return new Response("Plan required", { status: 400 });
        }
        const parsed = z.string().safeParse(planTypeString);
        if (!parsed.success) {
          return new Response("Invalid plan type", { status: 400 });
        }
        const planType = parsed.data;

        const result = await appContext.db.plans.find(planType);
        if (!result) {
          return new Response("Plan not found", { status: 404 });
        }

        return Response.json(result.value);
      },
    )
    .post(
      "/v1/plans",
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
        const parsed = z.string().safeParse(body.planType);
        if (!parsed.success) {
          return new Response("Invalid plan type", { status: 400 });
        }

        const planType = parsed.data;
        const result = await appContext.db.plans.add({
          planType,
          quotaRequestsPerMin: body.quotaRequestsPerMin,
          quotaStorageBytes: body.quotaStorageBytes,
        });

        if (!result.ok) {
          return new Response("Failed to create plan", { status: 500 });
        }

        return new Response(null, { status: 201 });
      },
    )
    .put(
      "/v1/plans/:plan",
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

        const planTypeString = ctx.params?.pathname.groups.plan;
        if (!planTypeString) {
          return new Response("Plan required", { status: 400 });
        }
        const parsed = z.string().safeParse(planTypeString);
        if (!parsed.success) {
          return new Response("Invalid plan type", { status: 400 });
        }
        const planType = parsed.data;

        const body = await ctx.request.json();

        // Validate that planType in body matches URL parameter
        if (body.planType !== planType) {
          return new Response("Plan type mismatch", { status: 400 });
        }

        // Check if plan exists, if not create it
        const existingPlan = await appContext.db.plans.find(planType);
        let result;
        if (!existingPlan) {
          result = await appContext.db.plans.add({
            planType: body.planType,
            quotaRequestsPerMin: body.quotaRequestsPerMin,
            quotaStorageBytes: body.quotaStorageBytes,
          });
        } else {
          result = await appContext.db.plans.update(planType, {
            planType: body.planType,
            quotaRequestsPerMin: body.quotaRequestsPerMin,
            quotaStorageBytes: body.quotaStorageBytes,
          });
        }

        if (!result.ok) {
          console.error("Plan update failed:", result);
          return new Response("Failed to update plan", { status: 500 });
        }

        return new Response(null, { status: 204 });
      },
    )
    .delete(
      "/v1/plans/:plan",
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

        const planTypeString = ctx.params?.pathname.groups.plan;
        if (!planTypeString) {
          return new Response("Plan required", { status: 400 });
        }
        const parsed = z.string().safeParse(planTypeString);
        if (!parsed.success) {
          return new Response("Invalid plan type", { status: 400 });
        }
        const planType = parsed.data;

        await appContext.db.plans.delete(planType);
        return new Response(null, { status: 204 });
      },
    );
