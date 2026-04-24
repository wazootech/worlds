import { EmbeddedWorlds } from "../engine/service.ts";
import type { Embeddings } from "../vectors/embeddings.ts";
import { ApiKeyRepository } from "../management/keys.ts";
import { NamespaceRepository } from "../management/namespaces.ts";
import { WorldRepository } from "../management/worlds.ts";
import { KvStoreEngine } from "../infrastructure/store.ts";

export function createMockEmbeddings(dimensions: number = 768): Embeddings {
  return {
    dimensions,
    embed: (texts: string | string[]) => {
      if (Array.isArray(texts)) {
        return Promise.resolve(Array(texts.length).fill(Array(dimensions).fill(1)));
      }
      return Promise.resolve(Array(dimensions).fill(1));
    },
  };
}

export async function createTestWorlds(): Promise<{ worlds: EmbeddedWorlds; storage: KvStoreEngine }> {
  const keys = new ApiKeyRepository();
  const namespaces = new NamespaceRepository();
  const worldsRepo = new WorldRepository();
  const storage = new KvStoreEngine();

  await namespaces.insert({
    id: "test-ns",
    label: "Test Namespace",
    created_at: Date.now(),
    updated_at: Date.now(),
  });

  const worlds = new EmbeddedWorlds({
    storage,
    management: { keys, namespaces, worlds: worldsRepo },
    namespace: "test-ns",
  });

  return { worlds, storage };
}