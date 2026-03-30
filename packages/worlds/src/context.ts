import type { Client } from "@libsql/client";
import type { Embeddings } from "#/embeddings/embeddings.ts";
import type { DatabaseManager } from "#/database/manager.ts";

/**
 * WorldsContext is the shared context for the Worlds engine.
 */
export interface WorldsContext {
  /**
   * apiKey is an optional API key for authentication.
   */
  apiKey?: string;

  /**
   * embeddings is the embedding strategy used for semantic search.
   */
  embeddings: Embeddings;

  /**
   * libsql contains the database client and manager.
   */
  libsql: {
    /**
     * database is the core LibSQL database client.
     */
    database: Client;

    /**
     * manager is the database manager for world-specific databases.
     */
    manager: DatabaseManager;
  };
}
