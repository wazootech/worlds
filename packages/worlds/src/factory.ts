import { KvStoreEngine } from "#/engines/store.ts";
import type { StoreEngine } from "#/engines/mod.ts";
import { ApiKeyRepository } from "#/management/keys.ts";
import { NamespaceRepository } from "#/management/namespaces.ts";
import { WorldRepository } from "#/management/worlds.ts";
import type { ManagementLayer } from "#/management/schema.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import type { WorldsOptions } from "./factory.ts";
import { Worlds, type WorldsEngineOptions } from "#/worlds/worlds.ts";
import { WorldsClient } from "#/worlds/client.ts";
import { OllamaEmbeddings } from "#/vectors/ollama.ts";
import { OpenRouterEmbeddings } from "#/vectors/openrouter.ts";
import { createOllama } from "ollama-ai-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

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
   * fetch fetches a resource from the network.
   */
  fetch?: typeof globalThis.fetch;

  /**
   * id is the default namespace identifier for this instance.
   */
  id?: string;
}

/**
 * WorldsContext is the shared context for the Worlds engine.
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
  storage: StoreEngine;

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

/**
 * WorldsContextConfig is the configuration for a Worlds engine context.
 */
export interface WorldsContextConfig {
  envs: {
    OPENROUTER_API_KEY?: string;
    OPENROUTER_EMBEDDINGS_MODEL?: string;
    OLLAMA_BASE_URL?: string;
    OLLAMA_EMBEDDINGS_MODEL?: string;
    WORLDS_EMBEDDINGS_DIMENSIONS?: string;
    WORLDS_API_KEY?: string;
    WORLDS_NS?: string;
  };
}

/**
 * createDefaultWorldsContextConfig creates the default configuration.
 * Uses a function to avoid eager allocation.
 */
export function createDefaultWorldsContextConfig(): WorldsContextConfig {
  return {
    envs: {
      WORLDS_EMBEDDINGS_DIMENSIONS: "1536",
      OLLAMA_BASE_URL: "http://localhost:11434",
      OLLAMA_EMBEDDINGS_MODEL: "nomic-embed-text",
      OPENROUTER_EMBEDDINGS_MODEL: "openai/text-embedding-3-small",
    },
  };
}

/**
 * createWorldsContext creates a minimalist WorldsContext from configuration.
 */
export function createWorldsContext(
  config: Partial<WorldsContextConfig>,
): WorldsContext {
  const defaults = createDefaultWorldsContextConfig();
  const finalConfig: WorldsContextConfig = {
    envs: { ...defaults.envs, ...config.envs },
  };

  const dimensions = parseInt(
    finalConfig.envs.WORLDS_EMBEDDINGS_DIMENSIONS || "1536",
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
      ),
      dimensions,
    });
  } else {
    const ollama = createOllama({ baseURL: finalConfig.envs.OLLAMA_BASE_URL! });
    embeddings = new OllamaEmbeddings({
      model: ollama.textEmbeddingModel(
        finalConfig.envs.OLLAMA_EMBEDDINGS_MODEL!,
      ),
      dimensions,
    });
  }

  const storage = new KvStoreEngine();
  const context: WorldsContext = {
    embeddings,
    management: {
      keys: new ApiKeyRepository(),
      namespaces: new NamespaceRepository(),
      worlds: new WorldRepository(),
    },
    storage,
    apiKey: finalConfig.envs.WORLDS_API_KEY,
    namespace: finalConfig.envs.WORLDS_NS,
    async [Symbol.asyncDispose]() {
      await Promise.resolve(storage.close());
    },
  };

  return context;
}

/**
 * createWorlds creates a new Worlds SDK.
 * Provides the default "Batteries Included" local engine with indexing.
 */
export async function createWorlds(
  options?: WorldsOptions,
): Promise<Worlds | WorldsClient> {
  const baseUrl = options?.baseUrl ?? Deno.env.get("WORLDS_BASE_URL");
  const apiKey = options?.apiKey ?? Deno.env.get("WORLDS_API_KEY");

  if (baseUrl && apiKey) {
    return new WorldsClient({ ...options, baseUrl, apiKey });
  }

  // Local Mode
  const context = await createWorldsContext({
    envs: {
      WORLDS_API_KEY: apiKey ?? crypto.randomUUID(),
      OPENROUTER_API_KEY: Deno.env.get("OPENROUTER_API_KEY"),
      OPENROUTER_EMBEDDINGS_MODEL: Deno.env.get("OPENROUTER_EMBEDDINGS_MODEL"),
      WORLDS_EMBEDDINGS_DIMENSIONS: Deno.env.get(
        "WORLDS_EMBEDDINGS_DIMENSIONS",
      ),
      OLLAMA_BASE_URL: Deno.env.get("OLLAMA_BASE_URL"),
      OLLAMA_EMBEDDINGS_MODEL: Deno.env.get("OLLAMA_EMBEDDINGS_MODEL"),
      WORLDS_NS: options?.id ?? Deno.env.get("WORLDS_NS"),
    },
  });

  const engineOptions: WorldsEngineOptions = {
    storeEngine: context.storage,
    embeddings: context.embeddings,
    management: context.management,
    namespace: context.namespace,
  };

  const worlds = new Worlds(engineOptions);

  return worlds;
}
