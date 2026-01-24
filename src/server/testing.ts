import { ulid } from "@std/ulid";
import { createWorldsKvdex } from "./db/kvdex.ts";
import type { AppContext } from "./app-context.ts";
import type { Account, WorldsKvdex } from "./db/kvdex.ts";
import { createClient } from "@libsql/client";

/**
 * createTestContext creates a test context for the application.
 */
export async function createTestContext(): Promise<AppContext> {
  const kv = await Deno.openKv(":memory:");
  const db = createWorldsKvdex(kv);
  const apiKey = "admin-api-key";

  const client = createClient({ url: ":memory:" });
  const embedder = {
    embed: (_: string) => Promise.resolve(new Array(768).fill(0)),
    dimensions: 768,
  };

  return {
    db,
    kv,
    admin: { apiKey },
    libsqlClient: client,
    embeddings: embedder,
  };
}

/**
 * createTestAccount creates a test account and returns its ID and API key.
 */
export async function createTestAccount(
  db: WorldsKvdex,
  account?: Partial<Account>,
): Promise<{ id: string; apiKey: string }> {
  const timestamp = Date.now();
  const id = account?.id ?? ulid(timestamp);
  const apiKey = account?.apiKey ?? ulid(timestamp);
  const result = await db.accounts.add({
    id,
    description: "Test account",
    plan: "free",
    apiKey,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...account,
  });
  if (!result.ok) {
    throw new Error("Failed to create test account");
  }

  return { id, apiKey };
}
