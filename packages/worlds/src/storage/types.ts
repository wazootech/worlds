import type { Client } from "@libsql/client";

/**
 * WorldOptions contains options for world database operations.
 */
export interface WorldOptions {
  /**
   * id is the world identifier (optional for lookup).
   */
  id?: string;

  /**
   * namespace is the optional namespace (uses internal lookup if not provided).
   */
  namespace?: string;
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
