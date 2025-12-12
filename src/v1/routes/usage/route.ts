import { Router } from "@fartlabs/rt";
import type { AppContext } from "#/app-context.ts";
import { authorizeRequest } from "#/accounts/authorize.ts";

export default ({ accountsService }: AppContext) => {
  return new Router()
    .get("/v1/usage", async (ctx) => {
      const authorized = await authorizeRequest(accountsService, ctx.request);
      if (!authorized) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Admin users need to specify an account ID
      if (authorized.admin) {
        const url = new URL(ctx.request.url);
        const accountId = url.searchParams.get("accountId");

        if (!accountId) {
          return Response.json(
            { error: "Admin users must specify accountId query parameter" },
            { status: 400 },
          );
        }

        const usageSummary = await accountsService.getUsageSummary(accountId);
        if (!usageSummary) {
          // Return empty usage summary if none exists yet
          return Response.json({ worlds: {} });
        }

        return Response.json(usageSummary);
      }

      // Regular users get their own usage summary
      if (!authorized.account) {
        return new Response("Unauthorized", { status: 401 });
      }

      const usageSummary = await accountsService.getUsageSummary(
        authorized.account.id,
      );

      if (!usageSummary) {
        // Return empty usage summary if none exists yet
        return Response.json({ worlds: {} });
      }

      return Response.json(usageSummary);
    });
};
