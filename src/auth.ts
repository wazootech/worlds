import type { ApiKeysService } from "#/api-keys/api-keys-service.ts";

export async function auth(
  request: Request,
  apiKeysService?: ApiKeysService,
): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return false;
  }

  // Check if token matches the owner API_KEY
  if (token === Deno.env.get("API_KEY")) {
    return true;
  }

  // Check if token is in the apiKeysService
  if (await apiKeysService?.has(token)) {
    return true;
  }

  return false;
}
