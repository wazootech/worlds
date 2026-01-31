import type { Client } from "@libsql/client";
import type { Embeddings } from "./embeddings/embeddings.ts";

/**
 * AppContext is shared by every route.
 */
export interface AppContext {
  libsqlClient: Client;
  embeddings: Embeddings;
  admin?: {
    apiKey: string;
  };
}
