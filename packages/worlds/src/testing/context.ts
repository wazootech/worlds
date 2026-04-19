import { ulid } from "@std/ulid";

/**
 * WorldsContext is the shared context for the Worlds engine.
 * In the new "Simple & Open" architecture, this is a minimalist configuration bag.
 */
export interface WorldsContext {
  /**
   * engine is the main Worlds engine instance.
   */
  engine?: import("../worlds/worlds.ts").WorldsEngine;

  /**
   * apiKey is an optional API key for authentication.
   */
  apiKey?: string;

  /**
   * embeddings is the embedding strategy used for semantic or vector search.
   */
  embeddings: Embeddings;

  /**
   * management provides handles for metadata operations.
   */
  management: ManagementLayer;

  /**
   * storage manages the underlying stores.
   */
  storage: import("../engines/store.ts").MemoryStoreRepository;

  /**
   * namespace is the default namespace for this context.
   */
  namespace?: string;

  /**
   * world is the default world for this context.
   */
  world?: string;

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  [Symbol.asyncDispose](): Promise<void>;
}
import { MemoryStoreRepository } from "#/engines/store.ts";
import { ApiKeyRepository } from "#/management/keys.ts";
import { NamespaceRepository } from "#/management/namespaces.ts";
import { WorldRepository } from "#/management/worlds.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import type { ManagementLayer } from "#/management/schema.ts";

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

  const storage = new MemoryStoreRepository();
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
