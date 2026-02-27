import type { Client } from "@libsql/client";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";
import type { DatabaseManager } from "#/lib/database/manager.ts";

/**
 * ServerContext is shared by every route.
 */
export interface ServerContext {
  apiKey?: string;
  embeddings: Embeddings;
  libsql: {
    database: Client;
    manager: DatabaseManager;
  };
}
