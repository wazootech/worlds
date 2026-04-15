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

/**
 * WorldsStorageManager manages world databases.
 */
export interface WorldsStorageManager {
  /**
   * create creates a new world database and returns its storage.
   */
  create(options: WorldOptions): Promise<WorldsStorage>;

  /**
   * get returns the world database for the given namespace and world.
   */
  get(options: WorldOptions): Promise<WorldsStorage>;

  /**
   * delete deletes the world database for the given namespace and world.
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
