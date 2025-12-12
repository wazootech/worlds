import type { Account, AccountsService } from "./accounts-service.ts";

// Prefix with 'sk_worlds_' for clear identification.
export const apiKeyPrefix = "sk_worlds_";

/**
 * AuthorizedRequest is the result of a successful authentication.
 */
export interface AuthorizedRequest {
  admin: boolean;
  account?: Account;
}

/**
 * authorizeRequest authorizes a request using Bearer token.
 */
export async function authorizeRequest(
  accounts: AccountsService,
  request: Request,
): Promise<AuthorizedRequest | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const accountId = authHeader.slice("Bearer ".length).trim();
  return await authorize(accounts, accountId);
}

/**
 * authorize authorizes a request.
 */
export async function authorize(
  accounts: AccountsService,
  apiKey: string,
): Promise<AuthorizedRequest | null> {
  // Service Role / Root Key check
  if (apiKey === Deno.env.get("ADMIN_API_KEY")) {
    return { admin: true };
  }

  const account = await accounts.getByApiKey(apiKey);
  if (!account) {
    return null;
  }

  return { admin: false, account };
}

/**
 * parseApiKey parses an API key into an account ID.
 */
export function parseApiKey(apiKey: string, prefix: string): string {
  if (!apiKey.startsWith(prefix)) {
    throw new Error("Invalid API key");
  }

  return apiKey.slice(prefix.length);
}
