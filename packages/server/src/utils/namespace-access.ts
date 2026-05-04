import type { AuthorizedRequest } from "@wazoo/worlds-sdk";

/**
 * assertNamespacePathAllowed returns an error response when the caller may not
 * use the given resolved namespace, or null when access is permitted.
 */
export function assertNamespacePathAllowed(
  authorized: AuthorizedRequest,
  resolvedNamespace: string,
  resolvedWorldId?: string,
): Response | null {
  if (authorized.admin) {
    return null;
  }

  // World-scoped key: only allow access to the exact world
  if (authorized.worldId) {
    if (resolvedWorldId && authorized.worldId === resolvedWorldId) {
      return null;
    }
    return Response.json(
      { error: { message: "World does not match API key" } },
      { status: 403 },
    );
  }

  // Namespace-scoped key
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
