/**
 * ApiKeyRow represents an API key record as stored.
 */
export interface ApiKeyRow {
  /**
   * key_hash is the SHA-256 hash of the API key.
   */
  key_hash: string;

  /**
   * namespace is the namespace ID associated with this key.
   * If set, the key grants access to all worlds within the namespace.
   * Mutually exclusive with worldId.
   */
  namespace?: string;

  /**
   * worldId is the world ID associated with this key.
   * If set, the key grants access to only this specific world.
   * Mutually exclusive with namespace.
   */
  worldId?: string;

  /**
   * created_at is the unix timestamp of creation.
   */
  created_at: number;
}

/**
 * ResolveResult is the authorization result for an API key.
 */
export interface ResolveResult {
  /**
   * namespace is the namespace this key grants access to, if any.
   */
  namespace?: string;

  /**
   * worldId is the world this key grants access to, if any.
   */
  worldId?: string;
}

/**
 * ApiKeyRepository manages API keys using KV pattern.
 *
 * Multitenancy: Each API key maps to a namespace via hash.
 * Key format: "${key_hash}" (SHA-256 hash of the key)
 *
 * This is the "api_keys table" - swap Map for SQLite to persist.
 */
export class ApiKeyRepository {
  private readonly keys = new Map<string, ApiKeyRow>();

  constructor() {}

  /**
   * resolve finds the namespace and world ID linked to the provided API key.
   * @param apiKey The API key secret to resolve.
   * @returns The resolve result (both fields undefined if not found).
   */
  async resolve(apiKey: string): Promise<ResolveResult | null> {
    const keyHash = await this.hashApiKey(apiKey);
    const row = this.keys.get(keyHash);
    if (!row) return null;
    return { namespace: row.namespace, worldId: row.worldId };
  }

  /**
   * create stores a new API key.
   * @param apiKey The API key to store.
   * @param namespace The namespace to associate with the key (all-worlds access).
   * @param worldId The world ID to associate with the key (single-world access).
   *                 Mutually exclusive with namespace.
   */
  async create(
    apiKey: string,
    namespace?: string,
    worldId?: string,
  ): Promise<void> {
    const keyHash = await this.hashApiKey(apiKey);
    this.keys.set(keyHash, {
      key_hash: keyHash,
      namespace,
      worldId,
      created_at: Date.now(),
    });
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
