import type { WorldsContext } from "@wazoo/worlds-sdk";

/**
 * AuthorizedRequest is the result of a successful authentication.
 */
export interface AuthorizedRequest {
  admin: boolean;
  namespaceId?: string;
}

/**
 * authorizeRequest authorizes a request using Bearer token.
 * Validates the token against the Registry World multitenancy registry.
 */
export async function authorizeRequest(
  appContext: WorldsContext,
  request: Request,
): Promise<AuthorizedRequest> {
  // If no admin API key is set, the server is in "open" mode (e.g. for local dev)
  if (!appContext.apiKey) {
    return { admin: true };
  }

  const engine = appContext.engine;
  if (!engine) {
    throw new Error("Engine not initialized in context");
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { admin: false };
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();

  // Admin key bypass (if configured in context)
  if (appContext.apiKey && apiKey === appContext.apiKey) {
    return { admin: true };
  }

  // Resolve namespace via ApiKeyRepository
  const apiKeysRepo = appContext.management.keys;
  const namespaceId = await apiKeysRepo.resolveNamespace(apiKey);

  if (namespaceId) {
    return { admin: false, namespaceId: namespaceId ?? undefined };
  }

  return { admin: false };
}
