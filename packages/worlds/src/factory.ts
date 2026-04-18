import { MemoryWorldsStorageManager } from "#/storage.ts";
import { ApiKeysRepository } from "#/system/keys/repository.ts";
import { NamespacesRepository } from "#/system/namespaces/repository.ts";
import { WorldsRepository } from "#/system/worlds/repository.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import type { WorldsContext } from "#/types.ts";
import { Worlds } from "#/worlds/worlds.ts";
import { LocalWorlds } from "#/worlds/local.ts";
import { OllamaEmbeddings } from "#/vectors/ollama.ts";
import { OpenRouterEmbeddings } from "#/vectors/openrouter.ts";
import { createOllama } from "ollama-ai-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * WorldsContextConfig is the configuration for a Worlds engine context.
 */
export interface WorldsContextConfig {
  /**
   * envs contains the environment variables used to configure the context.
   */
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
    WORLDS_EMBEDDINGS_DIMENSIONS: "768",
    OLLAMA_BASE_URL: "http://localhost:11434",
    OLLAMA_EMBEDDINGS_MODEL: "nomic-embed-text",
    OPENROUTER_EMBEDDINGS_MODEL: "openai/text-embedding-3-small",
  },
};

/**
 * createWorldsContext creates a WorldsContext from configuration.
 */
export async function createWorldsContext(
  config: WorldsContextConfig,
): Promise<WorldsContext> {
  // Merge config with defaults.
  config = {
    ...defaultWorldsContextConfig,
    ...config,
    envs: {
      ...defaultWorldsContextConfig.envs,
      ...config.envs,
    },
  };

  const dimensions = parseInt(
    config.envs.WORLDS_EMBEDDINGS_DIMENSIONS || "768",
  );

  // Resolve embeddings strategy.
  let vectors: Embeddings;
  if (
    config.envs.OPENROUTER_API_KEY && config.envs.OPENROUTER_EMBEDDINGS_MODEL
  ) {
    const openrouter = createOpenRouter({
      apiKey: config.envs.OPENROUTER_API_KEY,
    });
    vectors = new OpenRouterEmbeddings({
      model: openrouter.textEmbeddingModel(
        config.envs.OPENROUTER_EMBEDDINGS_MODEL,
      ),
      dimensions,
    });
  } else {
    const ollama = createOllama({
      baseURL: config.envs.OLLAMA_BASE_URL!,
    });
    vectors = new OllamaEmbeddings({
      model: ollama.textEmbeddingModel(config.envs.OLLAMA_EMBEDDINGS_MODEL!),
      dimensions,
    });
  }

  const storage = new MemoryWorldsStorageManager();
  const keys = new ApiKeysRepository();
  const namespaces = new NamespacesRepository();
  const worlds = new WorldsRepository();

  const context: WorldsContext = {
    vectors,
    keys,
    namespaces,
    worlds,
    storage,
    apiKey: config.envs.WORLDS_API_KEY,
    namespace: config.envs.WORLDS_WORLD_NAMESPACE,
    async [Symbol.asyncDispose]() {
      await this.engine?.close();
      await storage.close();
    },
  };

  return context;
}

/**
 * createWorlds creates a new Worlds SDK based on environment variables.
 */
export async function createWorlds(): Promise<Worlds> {
  const baseUrl = Deno.env.get("WORLDS_BASE_URL");
  const apiKey = Deno.env.get("WORLDS_API_KEY");

  if (baseUrl && apiKey) {
    return new Worlds({ baseUrl, apiKey });
  }

  const localApiKey = apiKey ?? crypto.randomUUID();
  const context = await createWorldsContext({
    envs: {
      WORLDS_API_KEY: localApiKey,
      OPENROUTER_API_KEY: Deno.env.get("OPENROUTER_API_KEY"),
      OPENROUTER_EMBEDDINGS_MODEL: Deno.env.get("OPENROUTER_EMBEDDINGS_MODEL"),
      WORLDS_EMBEDDINGS_DIMENSIONS: Deno.env.get(
        "WORLDS_EMBEDDINGS_DIMENSIONS",
      ),
      OLLAMA_BASE_URL: Deno.env.get("OLLAMA_BASE_URL"),
      OLLAMA_EMBEDDINGS_MODEL: Deno.env.get("OLLAMA_EMBEDDINGS_MODEL"),
      WORLDS_WORLD_NAMESPACE: Deno.env.get("WORLDS_WORLD_NAMESPACE"),
    },
  });

  const worlds = new Worlds({ engine: new LocalWorlds(context) });
  context.engine = worlds;
  await worlds.init();
  return worlds;
}
