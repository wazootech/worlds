import { ulid } from "@std/ulid";
import { MemoryStoreManager } from "#/engines/store.ts";
import { ApiKeyRepository } from "#/management/keys.ts";
import { NamespaceRepository } from "#/management/namespaces.ts";
import { WorldRepository } from "#/management/worlds.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import type { WorldsContext } from "#/types.ts";

/**
 * createTestContext creates a test application context with in-memory
 * Map-based management repositories and store manager.
 */
export async function createTestContext(): Promise<WorldsContext> {
  const keys = new ApiKeyRepository();
  const namespaces = new NamespaceRepository();
  const worlds = new WorldRepository();

  const mockEmbeddings: Embeddings = {
    dimensions: 768,
    embed: (texts: string | string[]) => {
      if (Array.isArray(texts)) {
        return Promise.resolve(Array(texts.length).fill(Array(768).fill(1)));
      }
      return Promise.resolve(Array(768).fill(1));
    },
  };

  const storage = new MemoryStoreManager();
  const apiKey = ulid();
  const namespaceId = "test-admin";
  const now = Date.now();

  // Register the API key for the test namespace
  await keys.create(apiKey, namespaceId);
  await namespaces.insert({
    id: namespaceId,
    label: "Test Admin",
    created_at: now,
    updated_at: now,
  });

  return {
    embeddings: mockEmbeddings,
    management: {
      keys,
      namespaces,
      worlds,
    },
    storage,
    apiKey,
    namespace: namespaceId,
    world: "test-world",
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
  const id = ulid();
  return Promise.resolve({ id, apiKey: context.apiKey });
}
