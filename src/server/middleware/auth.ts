import type { AppContext } from "#/server/app-context.ts";
import {
  tenantsFind,
  tenantsFindByApiKey,
} from "#/server/db/resources/tenants/queries.sql.ts";
import {
  type TenantRow,
  tenantRowSchema,
} from "#/server/db/resources/tenants/schema.ts";

/**
 * AuthorizedRequest is the result of a successful authentication.
 */
export interface AuthorizedRequest {
  admin: boolean;
  tenant: TenantRow | null;
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

  const value = tenantRowSchema.parse({
    id: row.id,
    label: row.label,
    description: row.description,
    plan: row.plan,
    api_key: row.api_key,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  });

  return {
    admin: true,
    tenant: value,
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

  const value = tenantRowSchema.parse({
    id: row.id,
    label: row.label,
    description: row.description,
    plan: row.plan,
    api_key: row.api_key,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  });

  return {
    admin: false,
    tenant: value,
  };
}
