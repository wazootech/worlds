import type { AuthorizedRequest } from "#/middleware/auth.ts";

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
    return Response.json(
      { error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }
  if (authorized.namespaceId !== resolvedNamespace) {
    return Response.json(
      { error: { message: "Namespace does not match credentials" } },
      { status: 403 },
    );
  }
  return null;
}
