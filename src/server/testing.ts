import { ulid } from "@std/ulid";
import type { Client } from "@libsql/client";
import type { AppContext } from "./app-context.ts";
import type { Account } from "./db/kvdex.ts";
import { createClient } from "@libsql/client";
import { initializeDatabase } from "./db/init.ts";
import { accountsAdd } from "./db/queries/accounts.sql.ts";

/**
 * createTestContext creates a test context for the application.
 */
export async function createTestContext(): Promise<AppContext> {
  const apiKey = "admin-api-key";

  const client = createClient({ url: ":memory:" });

  // Initialize database tables
  await initializeDatabase(client);

  const embedder = {
    embed: (_: string) => Promise.resolve(new Array(768).fill(0)),
    dimensions: 768,
  };

  return {
    admin: { apiKey },
    libsqlClient: client,
    embeddings: embedder,
  };
}

/**
 * createTestAccount creates a test account and returns its ID and API key.
 */
export async function createTestAccount(
  client: Client,
  account?: Partial<Account>,
): Promise<{ id: string; apiKey: string }> {
  const timestamp = Date.now();
  const id = account?.id ?? ulid(timestamp);
  const apiKey = account?.apiKey ?? ulid(timestamp);

  await client.execute({
    sql: accountsAdd,
    args: [
      id,
      account?.description ?? "Test account",
      account?.plan !== undefined ? account.plan : "free",
      apiKey,
      account?.createdAt ?? Date.now(),
      account?.updatedAt ?? Date.now(),
      account?.deletedAt ?? null,
    ],
  });

  return { id, apiKey };
}
