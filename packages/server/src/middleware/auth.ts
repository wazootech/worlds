import type { WorldsRegistry } from "@wazoo/worlds-sdk";

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
  registry: WorldsRegistry,
  request: Request,
): Promise<AuthorizedRequest> {
  if (!registry.apiKey) {
    return { admin: true };
  }

  const engine = registry.activeEngine;
  if (!engine) {
    throw new Error("Engine not initialized in registry");
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { admin: false };
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();

  // Admin key bypass (if configured in registry)
  if (registry.apiKey && apiKey === registry.apiKey) {
    return { admin: true };
  }

  // Resolve namespace via ApiKeyRepository
  const apiKeysRepo = registry.management.keys;
  const namespaceId = await apiKeysRepo.resolveNamespace(apiKey);

  if (namespaceId) {
    return { admin: false, namespaceId: namespaceId ?? undefined };
  }

  return { admin: false };
}
