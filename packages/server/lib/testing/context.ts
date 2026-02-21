import { createClient } from "@libsql/client";
import { ulid } from "@std/ulid/ulid";
import { initializeDatabase } from "#/lib/database/init.ts";
import { MemoryDatabaseManager } from "#/lib/database/managers/memory.ts";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";

import type { ServerContext } from "#/context.ts";

/**
 * createTestContext creates a test application context with an in-memory
 * database and mock embeddings.
 */
export async function createTestContext(): Promise<ServerContext> {
  const client = createClient({ url: ":memory:" });
  await initializeDatabase(client);

  const mockEmbeddings: Embeddings = {
    dimensions: 1536,
    embed: (texts: string | string[]) => {
      if (Array.isArray(texts)) {
        return Promise.resolve(Array(texts.length).fill(Array(1536).fill(0)));
      }
      return Promise.resolve(Array(1536).fill(0));
    },
  };

  const databaseManager = new MemoryDatabaseManager();

  return {
    embeddings: mockEmbeddings,
    libsql: {
      database: client,
      manager: databaseManager,
    },
    admin: {
      apiKey: ulid(),
    },
  };
}

/**
 * createTestOrganization creates a test organization and returns its ID and the admin API key.
 * Now that organization management is handles externally, this simply returns a new ID.
 */
export function createTestOrganization(
  context: ServerContext,
  _options?: { plan?: string },
): Promise<{ id: string; apiKey: string }> {
  const id = ulid();
  // Return the admin API key for authentication, as org keys are no longer valid
  return Promise.resolve({ id, apiKey: context.admin!.apiKey });
}
