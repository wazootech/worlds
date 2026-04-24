import { KvStoreEngine } from "../infrastructure/store.ts";
import type { StoreEngine } from "../infrastructure/mod.ts";
import { ApiKeyRepository } from "../management/keys.ts";
import { NamespaceRepository } from "../management/namespaces.ts";
import { type ManagementLayer, WorldRepository } from "../management/worlds.ts";
import type { Embeddings } from "../vectors/embeddings.ts";
import { Worlds } from "./service.ts";
import type { WorldsEngine, WorldsEngineOptions } from "./service.ts";
import { WorldsClient } from "../sdk/client.ts";
import { OllamaEmbeddings } from "../vectors/ollama.ts";
import { OpenRouterEmbeddings } from "../vectors/openrouter.ts";
import { createOllama } from "ollama-ai-provider";
import type { EmbeddingModel } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { resolveSource, setResolverConfig } from "../sources/resolver.ts";
import {
  type CreateWorldRequest,
  type DeleteWorldRequest,
  type ExportWorldRequest,
  type GetWorldRequest,
  type ImportWorldRequest,
  type ListWorldsRequest,
  type ListWorldsResponse,
  type SearchWorldsRequest,
  type SearchWorldsResponse,
  type SparqlQueryRequest,
  type SparqlQueryResponse,
  type UpdateWorldRequest,
  type World,
} from "../schema.ts";
import { mapRowsToWorlds, mapRowToWorld } from "../management/worlds.ts";

/**
 * WorldsManagement defines the management plane interface for worlds.
 */
export interface WorldsManagement {
  /**
   * listWorlds paginates all worlds.
   */
  listWorlds(input?: ListWorldsRequest): Promise<ListWorldsResponse>;

  /**
   * getWorld fetches a single world.
   */
  getWorld(input: GetWorldRequest): Promise<World | null>;

  /**
   * createWorld creates a new world.
   */
  createWorld(input: CreateWorldRequest): Promise<World>;

  /**
   * updateWorld updates world metadata.
   */
  updateWorld(input: UpdateWorldRequest): Promise<World>;

  /**
   * deleteWorld deletes a world.
   */
  deleteWorld(input: DeleteWorldRequest): Promise<void>;
}

/**
 * WorldsData defines the data plane interface for worlds (SPARQL, Search, Import/Export).
 */
export interface WorldsData {
  sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse>;
  search(input: SearchWorldsRequest): Promise<SearchWorldsResponse>;
  import(input: ImportWorldRequest): Promise<void>;
  export(input: ExportWorldRequest): Promise<ArrayBuffer>;
}

/**
 * WorldsManagementPlane defines the management plane interface for worlds (lifecycle).
 */
export interface WorldsManagementPlane {
  listWorlds(input?: ListWorldsRequest): Promise<ListWorldsResponse>;
  getWorld(input: GetWorldRequest): Promise<World | null>;
  createWorld(input: CreateWorldRequest): Promise<World>;
  updateWorld(input: UpdateWorldRequest): Promise<World>;
  deleteWorld(input: DeleteWorldRequest): Promise<void>;
}

/**
 * WorldsDataPlane defines the data plane interface for worlds (operations).
 */
export interface WorldsDataPlane {
  sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse>;
  search(input: SearchWorldsRequest): Promise<SearchWorldsResponse>;
  import(input: ImportWorldRequest): Promise<void>;
  export(input: ExportWorldRequest): Promise<ArrayBuffer>;
}

/**
 * WorldsOptions are the options for the Worlds API SDK.
 */
export interface WorldsOptions {
  /**
   * baseUrl is the base URL of the Worlds API. It should not include the /v1 suffix.
   */
  baseUrl?: string;

  /**
   * apiKey is the API key for the Worlds API.
   */
  apiKey?: string;

  /**
   * remote is the remote URL for the Worlds API.
   */
  remote?: string;

  /**
   * fetch fetches a resource from the network.
   */
  fetch?: typeof fetch;
}

/**
 * WorldsRegistry represents the global shared state and service container for a Worlds system.
 * Combines WorldsManagementPlane (lifecycle) and WorldsDataPlane (operations).
 */
export interface WorldsRegistry extends WorldsManagementPlane, WorldsDataPlane {
  /**
   * embeddings provides a vector embeddings implementation.
   */
  embeddings: Embeddings;

  /**
   * apiKey is the active administrative API key.
   */
  apiKey: string;

  /**
   * repositories provides direct access to the underlying metadata stores.
   * @internal
   */
  repositories: ManagementLayer;

  /**
   * storage manages the underlying stores.
   */
  storage: StoreEngine;

  /**
   * namespace is the default namespace for this registry.
   */
  namespace?: string;

  /**
   * id is the default world identifier for this registry.
   */
  id?: string;

  /**
   * activeEngine is the initialized Worlds engine for this registry, if any.
   */
  activeEngine?: WorldsEngine;

  /**
   * engine initializes or retrieves a Worlds engine from this registry.
   */
  engine(options?: WorldsOptions): Promise<WorldsEngine>;

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * WorldsContextConfig is renamed to WorldsRegistryConfig.
 */
export interface WorldsRegistryConfig {
  envs: {
    OPENROUTER_API_KEY?: string;
    OPENROUTER_EMBEDDINGS_MODEL?: string;
    OLLAMA_BASE_URL?: string;
    OLLAMA_EMBEDDINGS_MODEL?: string;
    WORLDS_EMBEDDINGS_DIMENSIONS?: string;
    WORLDS_API_KEY?: string;
    WORLDS_NS?: string;
    LIBSQL_URL?: string;
    LIBSQL_AUTH_TOKEN?: string;
    TURSO_API_TOKEN?: string;
    TURSO_ORG?: string;
    WORLDS_BASE_DIR?: string;
  };
}

/**
 * initRegistry initializes a new Service Container (WorldsRegistry).
 */
export async function initRegistry(
  config?: WorldsRegistryConfig,
): Promise<WorldsRegistry> {
  await Promise.resolve();
  const finalConfig: WorldsRegistryConfig = {
    envs: {
      OLLAMA_BASE_URL: Deno.env.get("OLLAMA_BASE_URL"),
      OLLAMA_EMBEDDINGS_MODEL: Deno.env.get("OLLAMA_EMBEDDINGS_MODEL") ||
        "nomic-embed-text",
      OPENROUTER_API_KEY: Deno.env.get("OPENROUTER_API_KEY"),
      OPENROUTER_EMBEDDINGS_MODEL:
        Deno.env.get("OPENROUTER_EMBEDDINGS_MODEL") ||
        "openai/text-embedding-3-small",
      WORLDS_EMBEDDINGS_DIMENSIONS:
        Deno.env.get("WORLDS_EMBEDDINGS_DIMENSIONS") ||
        "768",
      WORLDS_API_KEY: Deno.env.get("WORLDS_API_KEY"),
      WORLDS_NS: Deno.env.get("WORLDS_NS"),
      LIBSQL_URL: Deno.env.get("LIBSQL_URL"),
      LIBSQL_AUTH_TOKEN: Deno.env.get("LIBSQL_AUTH_TOKEN"),
      TURSO_API_TOKEN: Deno.env.get("TURSO_API_TOKEN"),
      TURSO_ORG: Deno.env.get("TURSO_ORG"),
      WORLDS_BASE_DIR: Deno.env.get("WORLDS_BASE_DIR"),
      ...config?.envs,
    },
  };

  const dimensions = parseInt(
    finalConfig.envs.WORLDS_EMBEDDINGS_DIMENSIONS || "768",
    10,
  );

  let embeddings: Embeddings;
  if (
    finalConfig.envs.OPENROUTER_API_KEY &&
    finalConfig.envs.OPENROUTER_EMBEDDINGS_MODEL
  ) {
    const openrouter = createOpenRouter({
      apiKey: finalConfig.envs.OPENROUTER_API_KEY,
    });
    embeddings = new OpenRouterEmbeddings({
      model: openrouter.textEmbeddingModel(
        finalConfig.envs.OPENROUTER_EMBEDDINGS_MODEL,
      ) as unknown as EmbeddingModel<string>,
      dimensions,
    });
  } else {
    // Note: createOllama/createOpenRouter are typically sync, but we use await
    // to satisfy the lint rule if we really want to keep it async for future-proofing.
    // Or we just remove async.
    const ollama = createOllama({ baseURL: finalConfig.envs.OLLAMA_BASE_URL! });
    embeddings = new OllamaEmbeddings({
      model: ollama.textEmbeddingModel(
        finalConfig.envs.OLLAMA_EMBEDDINGS_MODEL!,
      ),
      dimensions,
    });
  }

  const storage = new KvStoreEngine();
  const repositories: ManagementLayer = {
    keys: new ApiKeyRepository(),
    namespaces: new NamespaceRepository(),
    worlds: new WorldRepository(),
  };

  const registry: WorldsRegistry = {
    embeddings,
    repositories,
    storage,
    apiKey: finalConfig.envs.WORLDS_API_KEY || "",
    namespace: finalConfig.envs.WORLDS_NS,

    async listWorlds(input?: ListWorldsRequest): Promise<ListWorldsResponse> {
      const namespace = input?.parent || registry.namespace;
      const result = await repositories.worlds.list({ ...input, namespace });
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

      const row = await repositories.worlds.get(
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
      await repositories.worlds.insert({
        namespace: resolved.namespace,
        id: resolved.id!,
        label: input.displayName ?? resolved.id ?? "Untitled",
        description: input.description,
        connection_uri: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      const row = await repositories.worlds.get(
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
      await repositories.worlds.update(resolved.id, resolved.namespace, {
        label: input.displayName,
        description: input.description,
        updated_at: now,
      });

      const result = await repositories.worlds.get(
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

      await repositories.worlds.delete(resolved.id, resolved.namespace);
    },

    async sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse> {
      const engine = await registry.engine();
      return engine.sparql(input);
    },

    async search(input: SearchWorldsRequest): Promise<SearchWorldsResponse> {
      const engine = await registry.engine();
      return engine.search(input);
    },

    async import(input: ImportWorldRequest): Promise<void> {
      const engine = await registry.engine();
      return engine.import(input);
    },

    async export(input: ExportWorldRequest): Promise<ArrayBuffer> {
      const engine = await registry.engine();
      return engine.export(input);
    },

    async engine(options?: WorldsOptions) {
      return await createWorlds(this, options);
    },
    async [Symbol.asyncDispose]() {
      await storage.close();
    },
  };

  return registry;
}

/**
 * createWorlds initializes a polymorphic Worlds engine instance.
 */
export async function createWorlds(
  registryOrOptions?: WorldsRegistry | WorldsOptions,
  maybeOptions?: WorldsOptions,
): Promise<WorldsEngine> {
  const options = (maybeOptions ??
    (registryOrOptions && !("management" in registryOrOptions)
      ? registryOrOptions
      : undefined)) as WorldsOptions | undefined;

  // 1. Handle Remote/Client Case
  if (options?.baseUrl) {
    return new WorldsClient(options) as unknown as WorldsEngine;
  }

  // 2. Handle Registry/Service-Container Case
  if (
    registryOrOptions && "management" in registryOrOptions &&
    registryOrOptions.management
  ) {
    const registry = registryOrOptions as WorldsRegistry;
    const engineOptions: WorldsEngineOptions = {
      storage: registry.storage,
      management: registry.repositories,
      embeddings: registry.embeddings,
      namespace: registry.namespace,
      id: registry.id,
    };
    const engine = new Worlds(engineOptions);
    registry.activeEngine = engine;
    return engine;
  }

  // 3. One-off Bootstrap Case
  const registry = await initRegistry();
  return registry.engine(options);
}

export type { WorldsEngine };
