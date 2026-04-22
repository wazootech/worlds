import { ulid } from "@std/ulid";
import { KvStoreEngine } from "../infrastructure/store.ts";
import { ApiKeyRepository } from "../management/keys.ts";
import { NamespaceRepository } from "../management/namespaces.ts";
import { WorldRepository } from "../management/worlds.ts";
import type { Embeddings } from "../vectors/embeddings.ts";
import type { WorldsRegistry, WorldsManagement, WorldsData } from "../engine/factory.ts";
import { createWorlds } from "../mod.ts";
import { resolveSource } from "../sources/resolver.ts";
import { mapRowsToWorlds, mapRowToWorld } from "../management/worlds.ts";
import type {
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  ListWorldsResponse,
  SearchWorldsRequest,
  SearchWorldsResponse,
  SparqlQueryRequest,
  SparqlQueryResponse,
  UpdateWorldRequest,
  World,
} from "../schema.ts";

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
    repositories: {
      keys,
      namespaces,
      worlds,
    },
    management: {
      async listWorlds(input?: ListWorldsRequest): Promise<ListWorldsResponse> {
        const namespace = input?.parent || registry.namespace;
        const result = await worlds.list({ ...input, namespace });
        return {
          worlds: mapRowsToWorlds(result.worlds),
          nextPageToken: result.nextPageToken,
        };
      },

      async getWorld(input: GetWorldRequest): Promise<World | null> {
        const resolved = resolveSource(input.source, {
          namespace: registry.namespace,
        });
        if (!resolved.id) return null;

        const row = await worlds.get(
          resolved.id,
          resolved.namespace,
        );
        if (!row) return null;

        return mapRowToWorld(row);
      },

      async createWorld(input: CreateWorldRequest): Promise<World> {
        const nameOrId = input.id ||
          (input as Record<string, unknown>).name as string ||
          (input as Record<string, unknown>).world as string;
        if (!nameOrId) throw new Error("World identity required");

        const resolved = resolveSource(nameOrId, {
          namespace: input.parent || registry.namespace,
        });

        const now = Date.now();
        await worlds.insert({
          namespace: resolved.namespace,
          id: resolved.id!,
          label: input.displayName ?? resolved.id ?? "Untitled",
          description: input.description,
          connection_uri: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        const row = await worlds.get(
          resolved.id!,
          resolved.namespace,
        );
        return mapRowToWorld(row!);
      },

      async updateWorld(input: UpdateWorldRequest): Promise<World> {
        const resolved = resolveSource(input.source, {
          namespace: registry.namespace,
        });
        if (!resolved.id) throw new Error("World ID required");

        const now = Date.now();
        await worlds.update(resolved.id, resolved.namespace, {
          label: input.displayName,
          description: input.description,
          updated_at: now,
        });

        const result = await worlds.get(
          resolved.id,
          resolved.namespace,
        );
        return mapRowToWorld(result!);
      },

      async deleteWorld(input: DeleteWorldRequest): Promise<void> {
        const resolved = resolveSource(input.source, {
          namespace: registry.namespace,
        });
        if (!resolved.id) return;

        await worlds.delete(resolved.id, resolved.namespace);
        if (storage) {
          await storage.delete(resolved.id, resolved.namespace);
        }
      },
    },
    data: {
      async querySparql(
        input: SparqlQueryRequest,
      ): Promise<SparqlQueryResponse> {
        const engine = await registry.engine();
        return engine.querySparql(input);
      },
      async searchWorlds(
        input: SearchWorldsRequest,
      ): Promise<SearchWorldsResponse> {
        const engine = await registry.engine();
        return engine.searchWorlds(input);
      },
      async importData(input: ImportWorldRequest): Promise<void> {
        const engine = await registry.engine();
        return engine.importData(input);
      },
      async exportData(input: ExportWorldRequest): Promise<ArrayBuffer> {
        const engine = await registry.engine();
        return engine.exportData(input);
      },
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
