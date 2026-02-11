import type { Client } from "@libsql/client";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";
import type { DatabaseManager } from "#/lib/database/manager.ts";

// TODO: Consider rename to ServerContext

/**
 * AppContext is shared by every route.
 */
export interface AppContext {
  embeddings: Embeddings;
  libsql: {
    database: Client;
    manager: DatabaseManager;
  };
  admin?: {
    apiKey: string;
  };
}
