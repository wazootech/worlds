import type { Account } from "#/core/types/mod.ts";
export * from "#/core/types/mod.ts";

/**
 * AccountsService manages access control and authorization for the Worlds API.
 *
 * This service is responsible for:
 * - Account lifecycle management (create, read, update, delete)
 * - API key authentication and lookup
 * - World access control (granting/revoking access to specific worlds)
 *
 * All operations are designed to be atomic and thread-safe.
 */
export interface AccountsService {
  /**
   * set creates or updates an account.
   *
   * If the account already exists, it will be updated with the new values.
   * The API key is stored securely (hashed) in the database.
   *
   * @param account - The account to create or update
   * @throws {Error} If the account data is invalid or the operation fails
   */
  set(account: Account): Promise<void>;

  /**
   * get retrieves an account by its unique identifier.
   *
   * @param id - The unique account identifier
   * @returns The account if found, null otherwise
   */
  get(id: string): Promise<Account | null>;

  /**
   * getByApiKey retrieves an account by its API key.
   *
   * This is used for authentication - the API key is hashed and compared
   * against stored hashes to find the associated account.
   *
   * @param apiKey - The API key (typically prefixed with "sk_world_key_")
   * @returns The account if found, null otherwise
   */
  getByApiKey(apiKey: string): Promise<Account | null>;

  /**
   * remove permanently deletes an account and all associated data.
   *
   * This operation is irreversible and will cascade to:
   * - API keys associated with the account
   * - Usage records (may be retained for billing purposes)
   *
   * @param id - The unique account identifier
   * @throws {Error} If the account doesn't exist or the operation fails
   */
  remove(id: string): Promise<void>;

  /**
   * listAccounts retrieves all accounts in the system.
   *
   * This is typically used for administrative purposes. For production systems,
   * consider implementing pagination.
   *
   * @returns An array of all accounts
   */
  listAccounts(): Promise<Account[]>;

  /**
   * addWorldAccess grants an account access to a specific world.
   *
   * This operation is atomic and idempotent - calling it multiple times
   * with the same parameters has no additional effect.
   *
   * @param accountId - The unique account identifier
   * @param worldId - The unique world identifier
   * @throws {Error} If the account or world doesn't exist, or the operation fails
   */
  addWorldAccess(accountId: string, worldId: string): Promise<void>;

  /**
   * removeWorldAccess revokes an account's access to a specific world.
   *
   * This operation is atomic. After revocation, the account will no longer
   * be able to access the world, even if they have the world ID.
   *
   * @param accountId - The unique account identifier
   * @param worldId - The unique world identifier
   * @throws {Error} If the account or world doesn't exist, or the operation fails
   */
  removeWorldAccess(accountId: string, worldId: string): Promise<void>;
}
