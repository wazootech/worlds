import { ulid } from "@std/ulid";
import { KvStoreEngine } from "../infrastructure/store.ts";
import { ApiKeyRepository } from "../management/keys.ts";
import { NamespaceRepository } from "../management/namespaces.ts";
import { WorldRepository } from "../management/worlds.ts";
import type { Embeddings } from "../vectors/embeddings.ts";
import type { WorldsRegistry } from "../engine/factory.ts";
import { createWorlds } from "../mod.ts";

export type { WorldsRegistry };

/**
 * createTestRegistry creates a test application registry with in-memory
 * Map-based management repositories and store manager.
 */
export async function createTestRegistry(): Promise<WorldsRegistry> {
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

  const storage = new KvStoreEngine();
  const apiKey = ulid();
  const namespaceId = "test-admin";
  const now = Date.now();

  await keys.create(apiKey, namespaceId);
  await namespaces.insert({
    id: namespaceId,
    label: "Test Admin",
    created_at: now,
    updated_at: now,
  });

  const registry: WorldsRegistry = {
    embeddings: mockEmbeddings,
    management: {
      keys,
      namespaces,
      worlds,
    },
    storage,
    apiKey,
    namespace: namespaceId,
    id: "test-world",
    engine(options) {
      return createWorlds(this, options);
    },
    async [Symbol.asyncDispose]() {
      await storage.close();
    },
  };

  return registry;
}

/**
 * createTestNamespace creates a test namespace and returns its ID and the admin API key.
 */
export function createTestNamespace(
  registry: WorldsRegistry,
  _options?: { plan?: string },
): Promise<{ id: string; apiKey: string | undefined }> {
  const id = ulid();
  return Promise.resolve({ id, apiKey: registry.apiKey });
}
