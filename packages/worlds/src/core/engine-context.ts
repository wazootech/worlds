import { createClient } from "@libsql/client";
import { ulid } from "@std/ulid/ulid";
import { initializeDatabase } from "#/storage/init.ts";
import { MemoryWorldsStorageManager } from "#/storage/memory.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import type { WorldsContext } from "#/core/types.ts";
import { WORLDS } from "#/core/ontology.ts";

/**
 * createTestContext creates a test application context with an in-memory
 * database and mock embeddings.
 */
export async function createTestContext(): Promise<WorldsContext> {
  const system = createClient({ url: ":memory:" });
  await initializeDatabase(system);

  const mockEmbeddings: Embeddings = {
    dimensions: 768,
    embed: (texts: string | string[]) => {
      if (Array.isArray(texts)) {
        return Promise.resolve(Array(texts.length).fill(Array(768).fill(0)));
      }
      return Promise.resolve(Array(768).fill(0));
    },
  };

  const storage = new MemoryWorldsStorageManager();

  return {
    vectors: mockEmbeddings,
    system,
    storage,
    apiKey: ulid(),
    namespace: "test-admin",
    async [Symbol.asyncDispose]() {
      await storage.close();
      system.close();
    },
  };
}

/**
 * createTestNamespace creates a test namespace and returns its ID and the admin API key.
 * Now that namespace management is handled externally, this simply returns a new ID.
 */
export function createTestNamespace(
  context: WorldsContext,
  _options?: { plan?: string },
): Promise<{ id: string; apiKey: string | undefined }> {
  const id = `${WORLDS.BASE}namespaces/${ulid()}`;
  // Return the admin API key for authentication, as namespace keys are no longer valid
  return Promise.resolve({ id, apiKey: context.apiKey });
}
