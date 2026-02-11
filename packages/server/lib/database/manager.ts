import type { Client } from "@libsql/client";

/**
 * ManagedDatabase is a managed database.
 */
export interface ManagedDatabase {
  /**
   * url is the URL of the database.
   */
  url?: string;

  /**
   * authToken is the authentication token of the database.
   */
  authToken?: string;

  /**
   * database is the client for the database.
   */
  database: Client;
}

/**
 * DatabaseManager manages LibSQL databases.
 */
export interface DatabaseManager {
  /**
   * create creates a new LibSQL database and returns its client and info.
   */
  create(id: string): Promise<ManagedDatabase>;

  /**
   * get returns the LibSQL database for the given id, using provided info if available.
   */
  get(id: string): Promise<ManagedDatabase>;

  /**
   * delete deletes the LibSQL database for the given id.
   */
  delete(id: string): Promise<void>;
}
