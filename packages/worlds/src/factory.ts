import { MemoryStoreRepository } from "#/engines/store.ts";
import { ApiKeyRepository } from "#/management/keys.ts";
import { NamespaceRepository } from "#/management/namespaces.ts";
import { WorldRepository } from "#/management/worlds.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import type { WorldsContext, WorldsOptions } from "#/types.ts";
import { Worlds, type WorldsEngineOptions } from "#/worlds/worlds.ts";
import { RemoteWorlds } from "#/worlds/remote.ts";
import { OllamaEmbeddings } from "#/vectors/ollama.ts";
import { OpenRouterEmbeddings } from "#/vectors/openrouter.ts";
import { createOllama } from "ollama-ai-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

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
    WORLDS_WORLD_NAMESPACE?: string;
  };
}

/**
 * defaultWorldsContextConfig is the default configuration.
 */
export const defaultWorldsContextConfig: WorldsContextConfig = {
  envs: {
    WORLDS_EMBEDDINGS_DIMENSIONS: "1536",
    OLLAMA_BASE_URL: "http://localhost:11434",
    OLLAMA_EMBEDDINGS_MODEL: "nomic-embed-text",
    OPENROUTER_EMBEDDINGS_MODEL: "openai/text-embedding-3-small",
  },
};

/**
 * createWorldsContext creates a minimalist WorldsContext from configuration.
 */
export function createWorldsContext(
  config: WorldsContextConfig,
): WorldsContext {
  config = {
    ...defaultWorldsContextConfig,
    ...config,
    envs: { ...defaultWorldsContextConfig.envs, ...config.envs },
  };

  const dimensions = parseInt(
    config.envs.WORLDS_EMBEDDINGS_DIMENSIONS || "1536",
  );

  let embeddings: Embeddings;
  if (
    config.envs.OPENROUTER_API_KEY && config.envs.OPENROUTER_EMBEDDINGS_MODEL
  ) {
    const openrouter = createOpenRouter({
      apiKey: config.envs.OPENROUTER_API_KEY,
    });
    embeddings = new OpenRouterEmbeddings({
      model: openrouter.textEmbeddingModel(
        config.envs.OPENROUTER_EMBEDDINGS_MODEL,
      ),
      dimensions,
    });
  } else {
    const ollama = createOllama({ baseURL: config.envs.OLLAMA_BASE_URL! });
    embeddings = new OllamaEmbeddings({
      model: ollama.textEmbeddingModel(config.envs.OLLAMA_EMBEDDINGS_MODEL!),
      dimensions,
    });
  }

  const storage = new MemoryStoreRepository();
  const context: WorldsContext = {
    embeddings,
    management: {
      keys: new ApiKeyRepository(),
      namespaces: new NamespaceRepository(),
      worlds: new WorldRepository(),
    },
    storage,
    apiKey: config.envs.WORLDS_API_KEY,
    namespace: config.envs.WORLDS_WORLD_NAMESPACE,
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
): Promise<Worlds | RemoteWorlds> {
  const baseUrl = options?.baseUrl ?? Deno.env.get("WORLDS_BASE_URL");
  const apiKey = options?.apiKey ?? Deno.env.get("WORLDS_API_KEY");

  if (baseUrl && apiKey) {
    return new RemoteWorlds({ ...options, baseUrl, apiKey });
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
      WORLDS_WORLD_NAMESPACE: options?.namespace ??
        Deno.env.get("WORLDS_WORLD_NAMESPACE"),
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
