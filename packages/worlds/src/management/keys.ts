/**
 * ApiKeyRepository manages API keys using KV pattern.
 *
 * The key is a hash of the API key, value is the namespace ID.
 * This enables auth lookups without storing plaintext keys.
 *
 * This is the "api_keys table" - swap Map for SQLite to persist.
 */
export class ApiKeyRepository {
  private readonly keys = new Map<string, string | undefined>();

  constructor() {}

  /**
   * resolveNamespace finds the namespace ID linked to the provided API key.
   * @param apiKey The API key secret to resolve.
   * @returns The namespace ID (undefined for root namespace) or null if not found.
   */
  async resolveNamespace(apiKey: string): Promise<string | undefined | null> {
    const keyHash = await this.hashApiKey(apiKey);
    if (!this.keys.has(keyHash)) return null;
    return this.keys.get(keyHash);
  }

  /**
   * create stores a new API key.
   * @param apiKey The API key to store.
   * @param namespace The namespace to associate with the key.
   */
  async create(apiKey: string, namespace?: string): Promise<void> {
    const keyHash = await this.hashApiKey(apiKey);
    this.keys.set(keyHash, namespace);
  }

  /**
   * delete removes an API key.
   * @param apiKey The API key to delete.
   */
  async delete(apiKey: string): Promise<void> {
    const keyHash = await this.hashApiKey(apiKey);
    this.keys.delete(keyHash);
  }

  private async hashApiKey(apiKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}
