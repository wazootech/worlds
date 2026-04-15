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
 * DatabaseManager manages LibSQL databases.
 */
export interface DatabaseManager {
  /**
   * create creates a new LibSQL database and returns its client and info.
   */
  create(options: WorldOptions): Promise<ManagedDatabase>;

  /**
   * get returns the LibSQL database for the given namespace and world.
   */
  get(options: WorldOptions): Promise<ManagedDatabase>;

  /**
   * delete deletes the LibSQL database for the given namespace and world.
   */
  delete(options: WorldOptions): Promise<void>;

  /**
   * close shuts down all managed database connections.
   */
  close(): Promise<void>;

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  [Symbol.asyncDispose](): Promise<void>;
}
