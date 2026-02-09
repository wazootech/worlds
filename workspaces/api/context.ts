import type { Client } from "@libsql/client";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";
import type { DatabaseManager } from "#/lib/database/manager.ts";

/**
 * AppContext is shared by every route.
 */
export interface AppContext {
  database: Client;
  databaseManager: DatabaseManager;
  embeddings: Embeddings;
  admin?: {
    apiKey: string;
  };
}
