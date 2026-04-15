import type { Client } from "@libsql/client";
import {
  toResolvedSource,
  toStorageName as resolveStorageName,
} from "#/core/sources.ts";

/**
 * WorldOptions contains options for world database operations.
 */
export interface WorldOptions {
  /**
   * world is the world identifier.
   */
  world: string | null;

  /**
   * namespace is the optional namespace (uses internal lookup if not provided).
   */
  namespace?: string | null;
}

/**
 * toStorageName generates a storage name from WorldOptions.
 * Returns a "namespace:world" string used for cache keys, storage keys, and database lookups.
 * Uses defaultWorldsNamespaceNameSegment and defaultWorldsWorldNameSegment as fallbacks.
 */
export function toStorageName(options: WorldOptions): string {
  const resolved = toResolvedSource(options);
  return resolveStorageName(resolved);
}

/**
 * WorldsStorage is a managed world database.
 */
export interface WorldsStorage {
  /**
   * database is the client for the database.
   */
  database: Client;

  /**
   * url is the URL of the database.
   */
  url?: string;

  /**
   * authToken is the authentication token of the database.
   */
  authToken?: string;
}
