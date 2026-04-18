import { ulid } from "@std/ulid";
import { MemoryWorldsStorageManager } from "#/storage.ts";
import { ApiKeysRepository } from "#/system/keys/repository.ts";
import { NamespacesRepository } from "#/system/namespaces/repository.ts";
import { WorldsRepository } from "#/system/worlds/repository.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import type { WorldsContext } from "#/types.ts";

/**
 * createTestContext creates a test application context with in-memory
 * Map-based repositories and storage.
 */
export async function createTestContext(): Promise<WorldsContext> {
  const keys = new ApiKeysRepository();
  const namespaces = new NamespacesRepository();
  const worlds = new WorldsRepository();

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
    keys,
    namespaces,
    worlds,
    storage,
    apiKey: ulid(),
    namespace: "test-admin",
    async [Symbol.asyncDispose]() {
      await storage.close();
    },
  };
}

/**
 * createTestNamespace creates a test namespace and returns its ID and the admin API key.
 */
export function createTestNamespace(
  context: WorldsContext,
  _options?: { plan?: string },
): Promise<{ id: string; apiKey: string | undefined }> {
  const id = `https://wazoo.dev/worlds/namespaces/${ulid()}`;
  return Promise.resolve({ id, apiKey: context.apiKey });
}
