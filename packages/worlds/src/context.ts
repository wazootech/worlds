import type { Client } from "@libsql/client";
import type { Embeddings } from "#/embeddings/embeddings.ts";
import type { DatabaseManager } from "#/database/manager.ts";

/**
 * WorldsContext is the shared context for the Worlds engine.
 */
export interface WorldsContext {
  apiKey?: string;
  embeddings: Embeddings;
  libsql: {
    database: Client;
    manager: DatabaseManager;
  };
}
