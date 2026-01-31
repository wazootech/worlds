import type { AppContext } from "#/server/app-context.ts";
import {
  tenantsFind,
  tenantsFindByApiKey,
} from "#/server/db/queries/tenants.sql.ts";

/**
 * AuthorizedRequest is the result of a successful authentication.
 */
export interface AuthorizedRequest {
  admin: boolean;
  tenant: {
    id: string;
    value: {
      id: string;
      description?: string;
      plan?: string;
      apiKey: string;
      createdAt: number;
      updatedAt: number;
      deletedAt?: number;
    };
  } | null;
}

/**
 * authorizeRequest authorizes a request using Bearer token and associates
 * a tenant with the request.
 */
export async function authorizeRequest(
  appContext: AppContext,
  request: Request,
): Promise<AuthorizedRequest> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { admin: false, tenant: null };
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();
  const authorized = await authorize(appContext, apiKey);
  if (!authorized.admin) {
    return authorized;
  }

  // Get the tenant desired by the admin.
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenant");

  if (!tenantId) {
    return authorized;
  }

  const result = await appContext.libsqlClient.execute({
    sql: tenantsFind,
    args: [tenantId],
  });

  const row = result.rows[0];
  if (!row || row.deleted_at != null) {
    return authorized;
  }

  return {
    admin: true,
    tenant: {
      id: tenantId,
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
    return { admin: true, tenant: null };
  }

  const result = await libsqlClient.execute({
    sql: tenantsFindByApiKey,
    args: [apiKey],
  });

  const row = result.rows[0];
  if (!row) {
    return { admin: false, tenant: null };
  }

  return {
    admin: false,
    tenant: {
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
