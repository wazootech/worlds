import type { Account } from "#/server/db/kvdex.ts";
import type { AppContext } from "#/server/app-context.ts";
import {
  accountsFind,
  accountsFindByApiKey,
} from "#/server/db/queries/accounts.sql.ts";

/**
 * AuthorizedRequest is the result of a successful authentication.
 */
export interface AuthorizedRequest {
  admin: boolean;
  account: {
    id: string;
    value: Account;
  } | null;
}

/**
 * authorizeRequest authorizes a request using Bearer token and associates
 * an account with the request.
 */
export async function authorizeRequest(
  appContext: AppContext,
  request: Request,
): Promise<AuthorizedRequest> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { admin: false, account: null };
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();
  const authorized = await authorize(appContext, apiKey);
  if (!authorized.admin) {
    return authorized;
  }

  // Get the account desired by the admin.
  const url = new URL(request.url);
  const accountId = url.searchParams.get("account");

  if (!accountId) {
    return authorized;
  }

  const result = await appContext.libsqlClient.execute({
    sql: accountsFind,
    args: [accountId],
  });

  const row = result.rows[0];
  if (!row || row.deleted_at != null) {
    return authorized;
  }

  return {
    admin: true,
    account: {
      id: accountId,
      value: {
        id: row.id as string,
        description: row.description as string | undefined,
        plan: row.plan as string | undefined,
        apiKey: row.api_key as string,
        createdAt: row.created_at as number,
        updatedAt: row.updated_at as number,
        deletedAt: (row.deleted_at as number | null) ?? undefined,
      },
    },
  };
}

/**
 * authorize authorizes a request.
 */
export async function authorize(
  { libsqlClient, admin }: AppContext,
  apiKey: string,
): Promise<AuthorizedRequest> {
  if (apiKey === admin?.apiKey) {
    return { admin: true, account: null };
  }

  const result = await libsqlClient.execute({
    sql: accountsFindByApiKey,
    args: [apiKey],
  });

  const row = result.rows[0];
  if (!row) {
    return { admin: false, account: null };
  }

  return {
    admin: false,
    account: {
      id: row.id as string,
      value: {
        id: row.id as string,
        description: row.description as string | undefined,
        plan: row.plan as string | undefined,
        apiKey: row.api_key as string,
        createdAt: row.created_at as number,
        updatedAt: row.updated_at as number,
        deletedAt: row.deleted_at as number | undefined,
      },
    },
  };
}
