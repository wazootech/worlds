import type { Client } from "@libsql/client";
import type { Embeddings } from "./embeddings/embeddings.ts";
import type { WorldsKvdex } from "./db/kvdex.ts";

/**
 * AppContext is shared by every route.
 */
export interface AppContext {
  kv: Deno.Kv;
  db: WorldsKvdex;
  libsqlClient: Client;
  embeddings: Embeddings;
  admin?: {
    apiKey: string;
  };
}
