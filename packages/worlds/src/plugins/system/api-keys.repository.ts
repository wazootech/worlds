import type { Client } from "@libsql/client";
import {
  deleteApiKey,
  insertApiKey,
  selectNamespaceByApiKey,
} from "./registry.sql.ts";

const MAX_API_KEY_LENGTH = 1024;

/**
 * hashApiKey generates a SHA256 hash of the API key.
 * @param apiKey The API key to hash.
 * @returns The hex-encoded SHA256 hash.
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * validateApiKey ensures the API key meets security requirements.
 * @param apiKey The API key to validate.
 * @throws Error if the API key exceeds maximum length.
 */
function validateApiKey(apiKey: string): void {
  if (apiKey.length > MAX_API_KEY_LENGTH) {
    throw new Error(
      `API key exceeds maximum allowed length of ${MAX_API_KEY_LENGTH} characters`,
    );
  }
}

/**
 * ApiKeysRepository handles API key persistence in the registry database.
 */
export class ApiKeysRepository {
  /**
   * constructor initializes the ApiKeysRepository with a database client.
   * @param db The database client.
   */
  constructor(private readonly db: Client) {}

  /**
   * resolveNamespace finds the namespace ID linked to the provided API key.
   * @param apiKey The API key secret to resolve.
   * @returns The namespace ID (undefined for root namespace) or null if not found.
   */
  async resolveNamespace(apiKey: string): Promise<string | undefined | null> {
    validateApiKey(apiKey);
    const keyHash = await hashApiKey(apiKey);
    const result = await this.db.execute({
      sql: selectNamespaceByApiKey,
      args: [keyHash],
    });
    if (result.rows.length === 0) return null;

    const ns = result.rows[0].namespace;
    return (ns === null) ? undefined : (ns as string);
  }

  /**
   * create stores a new API key.
   * @param apiKey The API key to store.
   * @param namespace The namespace to associate with the key.
   */
  async create(apiKey: string, namespace?: string): Promise<void> {
    validateApiKey(apiKey);
    const keyHash = await hashApiKey(apiKey);
    await this.db.execute({
      sql: insertApiKey,
      args: [keyHash, namespace ?? null, Date.now()],
    });
  }

  /**
   * delete removes an API key.
   * @param apiKey The API key to delete.
   */
  async delete(apiKey: string): Promise<void> {
    const keyHash = await hashApiKey(apiKey);
    await this.db.execute({ sql: deleteApiKey, args: [keyHash] });
  }
}
