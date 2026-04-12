import type { AuthorizedRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";

/**
 * assertNamespacePathAllowed returns an error response when the caller may not
 * use the given resolved namespace, or null when access is permitted.
 */
export function assertNamespacePathAllowed(
  authorized: AuthorizedRequest,
  resolvedNamespace: string,
): Response | null {
  if (authorized.admin) {
    return null;
  }
  if (!authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }
  if (authorized.namespaceId !== resolvedNamespace) {
    return ErrorResponse.Forbidden("Namespace does not match credentials");
  }
  return null;
}
