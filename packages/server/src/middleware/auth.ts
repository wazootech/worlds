import type { WorldsContext } from "@wazoo/worlds-sdk";

/**
 * AuthorizedRequest is the result of a successful authentication.
 */
export interface AuthorizedRequest {
  admin: boolean;
}

/**
 * authorizeRequest authorizes a request using Bearer token.
 * Accepts only the admin API key.
 */
export function authorizeRequest(
  appContext: WorldsContext,
  request: Request,
): AuthorizedRequest {
  if (!appContext.apiKey) {
    return { admin: true };
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { admin: false };
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();

  if (apiKey === appContext.apiKey) {
    return { admin: true };
  }

  return { admin: false };
}
