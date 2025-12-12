import { Router } from "@fartlabs/rt";
import type { AppContext } from "#/app-context.ts";
import type { Account } from "#/accounts/accounts-service.ts";
import { isAccount } from "#/accounts/accounts-service.ts";
import { apiKeyPrefix, authorizeRequest } from "#/accounts/authorize.ts";

export default ({ accountsService, oxigraphService }: AppContext) => {
  return new Router()
    .get(
      "/v1/accounts",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const accounts = await accountsService.listAccounts();
        return Response.json(accounts);
      },
    )
    .post(
      "/v1/accounts",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        // Parse request body
        let account: Account;
        try {
          account = await ctx.request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        // Generate a cryptographically secure API key
        const apiKey = `${apiKeyPrefix}${
          crypto.randomUUID().replace(/-/g, "")
        }`;
        account.apiKey = apiKey;

        // Validate account
        if (!isAccount(account)) {
          return Response.json(
            {
              error:
                "Invalid account fields. Required: id, description, plan, accessControl",
            },
            { status: 400 },
          );
        }

        // Check if account already exists
        const existing = await accountsService.get(account.id);
        if (existing) {
          return Response.json(
            { error: "Account already exists" },
            { status: 409 },
          );
        }

        // Create account
        await accountsService.set(account);
        return Response.json(account, { status: 201 });
      },
    )
    .get(
      "/v1/accounts/:accountId",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const accountId = ctx.params?.pathname.groups.accountId;
        if (!accountId) {
          return new Response("Account ID required", { status: 400 });
        }

        const account = await accountsService.get(accountId);
        if (!account) {
          return new Response("Account not found", { status: 404 });
        }

        return Response.json(account);
      },
    )
    .get(
      "/v1/accounts/:accountId/worlds",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const accountId = ctx.params?.pathname.groups.accountId;
        if (!accountId) {
          return new Response("Account ID required", { status: 400 });
        }

        const account = await accountsService.get(accountId);
        if (!account) {
          return new Response("Account not found", { status: 404 });
        }

        const metadata = await oxigraphService.getManyMetadata(
          account.accessControl.worlds,
        );

        // Return list of most recent world metadata.
        return Response.json(
          metadata
            .filter((world) => world !== null)
            .toSorted((a, b) => b.updatedAt - a.updatedAt),
        );
      },
    )
    .put(
      "/v1/accounts/:accountId",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const accountId = ctx.params?.pathname.groups.accountId;
        if (!accountId) {
          return new Response("Account ID required", { status: 400 });
        }

        // Parse request body
        let account: Account;
        try {
          account = await ctx.request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        // Ensure ID matches
        if (account.id !== accountId) {
          return Response.json(
            { error: "Account ID mismatch" },
            { status: 400 },
          );
        }

        // Validate account
        if (!isAccount(account)) {
          return Response.json(
            {
              error:
                "Invalid account fields. Required: id, description, plan, accessControl",
            },
            { status: 400 },
          );
        }

        // Update account
        await accountsService.set(account);
        return new Response(null, { status: 204 });
      },
    )
    .delete(
      "/v1/accounts/:accountId",
      async (ctx) => {
        const authorized = await authorizeRequest(accountsService, ctx.request);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!authorized.admin) {
          return new Response("Forbidden: Admin access required", {
            status: 403,
          });
        }

        const accountId = ctx.params?.pathname.groups.accountId;
        if (!accountId) {
          return new Response("Account ID required", { status: 400 });
        }

        await accountsService.remove(accountId);
        return new Response(null, { status: 204 });
      },
    );
};
