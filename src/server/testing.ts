import { ulid } from "@std/ulid";
import type { Client } from "@libsql/client";
import type { AppContext } from "./app-context.ts";
import { createClient } from "@libsql/client";
import { initializeDatabase } from "./db/init.ts";
import { tenantsAdd } from "./db/resources/tenants/queries.sql.ts";

/**
 * createTestContext creates a test context for the application.
 */
export async function createTestContext(): Promise<AppContext> {
  const apiKey = "admin-api-key";

  const client = createClient({ url: ":memory:" });

  // Initialize database tables
  await initializeDatabase(client);

  const embedder = {
    embed: (_: string) => Promise.resolve(new Array(1536).fill(0)),
    dimensions: 1536,
  };

  return {
    admin: { apiKey },
    libsqlClient: client,
    embeddings: embedder,
  };
}

/**
 * createTestTenant creates a test tenant and returns its ID and API key.
 */
export async function createTestTenant(
  client: Client,
  tenant?: {
    id?: string;
    description?: string;
    plan?: string | null;
    apiKey?: string;
    createdAt?: number;
    updatedAt?: number;
    deletedAt?: number | null;
  },
): Promise<{ id: string; apiKey: string }> {
  const timestamp = Date.now();
  const id = tenant?.id ?? ulid(timestamp);
  const apiKey = tenant?.apiKey ?? ulid(timestamp);

  await client.execute({
    sql: tenantsAdd,
    args: [
      id,
      tenant?.description ?? "Test tenant",
      tenant?.plan === undefined ? "free" : tenant.plan,
      apiKey,
      tenant?.createdAt ?? Date.now(),
      tenant?.updatedAt ?? Date.now(),
      tenant?.deletedAt ?? null,
    ],
  });

  return { id, apiKey };
}
