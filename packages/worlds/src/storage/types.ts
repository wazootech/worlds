import type { Client } from "@libsql/client";

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
