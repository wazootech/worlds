import type { AppContext } from "#/context.ts";
import { ServiceAccountsService } from "#/lib/database/tables/service-accounts/service.ts";

/**
 * AuthorizedRequest is the result of a successful authentication.
 */
export interface AuthorizedRequest {
  admin: boolean;
  /** Set when the request is authenticated as a service account (Bearer token matched a service account). Undefined for admin or unauthenticated. */
  serviceAccountId?: string;
  /** Set when the request is authenticated as a service account. The organization ID the account belongs to. */
  organizationId?: string;
}

/**
 * authorizeRequest authorizes a request using Bearer token.
 * Accepts either the admin API key or a service account API key.
 */
export async function authorizeRequest(
  appContext: AppContext,
  request: Request,
): Promise<AuthorizedRequest> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { admin: false };
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();

  if (apiKey === appContext.admin?.apiKey) {
    return { admin: true };
  }

  const serviceAccountsService = new ServiceAccountsService(
    appContext.database,
  );
  const account = await serviceAccountsService.getByApiKey(apiKey);
  if (account != null) {
    return {
      admin: false,
      serviceAccountId: account.id,
      organizationId: account.organization_id,
    };
  }

  return { admin: false };
}
