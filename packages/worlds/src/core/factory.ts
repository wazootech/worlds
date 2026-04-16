import type { WorldsContext } from "#/core/types.ts";
import type { WorldsStorageManager } from "#/storage/worlds.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import { createClient } from "@libsql/client";
import { createOllama } from "ollama-ai-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createClient as createTursoClient } from "@tursodatabase/api";
import { dirname } from "@std/path";
import { Worlds } from "#/worlds/worlds.ts";
import { LocalWorlds } from "#/worlds/local.ts";
import { TursoCloudWorldsStorageManager } from "#/storage/turso.ts";
import { FileWorldsStorageManager } from "#/storage/file.ts";
import { initializeDatabase } from "#/storage/init.ts";
import { OllamaEmbeddings } from "#/vectors/ollama.ts";
import { OpenRouterEmbeddings } from "#/vectors/openrouter.ts";

/**
 * WorldsContextConfig is the configuration for a Worlds engine context.
 * Historically known as ServerContextConfig.
 */
export interface WorldsContextConfig {
  /**
   * envs contains the environment variables used to configure the context.
   */
  envs: {
    /**
     * LIBSQL_URL is the URL of the LibSQL database (e.g., file:worlds.db or libsubsq://...).
     */
    LIBSQL_URL?: string;

    /**
     * LIBSQL_AUTH_TOKEN is the authentication token for the LibSQL database.
     */
    LIBSQL_AUTH_TOKEN?: string;

    /**
     * TURSO_API_TOKEN is the API token for Turso Cloud management.
     */
    TURSO_API_TOKEN?: string;

    /**
     * TURSO_ORG is the organization name for Turso Cloud.
     */
    TURSO_ORG?: string;

    /**
     * OPENROUTER_API_KEY is the API key for OpenRouter embeddings.
     */
    OPENROUTER_API_KEY?: string;

    /**
     * OPENROUTER_EMBEDDINGS_MODEL is the model name for OpenRouter embeddings.
     */
    OPENROUTER_EMBEDDINGS_MODEL?: string;

    /**
     * OLLAMA_BASE_URL is the base URL for the Ollama API.
     */
    OLLAMA_BASE_URL?: string;

    /**
     * OLLAMA_EMBEDDINGS_MODEL is the model name for Ollama embeddings.
     */
    OLLAMA_EMBEDDINGS_MODEL?: string;

    /**
     * WORLDS_EMBEDDINGS_DIMENSIONS is the number of dimensions for the embeddings.
     */
    WORLDS_EMBEDDINGS_DIMENSIONS?: string;

    /**
     * WORLDS_API_KEY is the master API key for the Worlds engine.
     */
    WORLDS_API_KEY?: string;

    /**
     * WORLDS_BASE_DIR is the base directory for local file-based databases.
     */
    WORLDS_BASE_DIR?: string;

    /**
     * WORLDS_WORLD_NAMESPACE is the unique identifier of the namespace for this context engine.
     */
    WORLDS_WORLD_NAMESPACE?: string;
  };
}

/**
 * defaultWorldsContextConfig is the default configuration.
 */
export const defaultWorldsContextConfig: WorldsContextConfig = {
  envs: {
    LIBSQL_URL: "file:./worlds.db",
    WORLDS_BASE_DIR: "./worlds",
    WORLDS_EMBEDDINGS_DIMENSIONS: "768",
    OLLAMA_BASE_URL: "http://localhost:11434",
    OLLAMA_EMBEDDINGS_MODEL: "nomic-embed-text",
    OPENROUTER_EMBEDDINGS_MODEL: "openai/text-embedding-3-small",
  },
};

/**
 * createWorldsContext creates a WorldsContext from configuration.
 * Historically known as createServerContext.
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

  // Validate required environment variables.
  if (!config.envs.WORLDS_EMBEDDINGS_DIMENSIONS) {
    throw new Error("WORLDS_EMBEDDINGS_DIMENSIONS is required");
  }

  const dimensions = parseInt(config.envs.WORLDS_EMBEDDINGS_DIMENSIONS);

  if (!config.envs.LIBSQL_URL) {
    throw new Error("LIBSQL_URL is required");
  }

  if (!config.envs.WORLDS_BASE_DIR) {
    throw new Error("WORLDS_BASE_DIR is required");
  }

  // Resolve database strategy based on environment variables.
  if (config.envs.LIBSQL_URL?.startsWith("file:")) {
    const dbPath = config.envs.LIBSQL_URL.slice(5); // Remove "file:"
    await Deno.mkdir(dirname(dbPath), { recursive: true });
  }

  // Resolve database strategy based on environment variables.
  const system = createClient({
    url: config.envs.LIBSQL_URL!,
    authToken: config.envs.LIBSQL_AUTH_TOKEN,
  });

  // Initialize database tables.
  await initializeDatabase(system);

  // Resolve embeddings strategy based on environment variables.
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

  // Resolve storage manager strategy based on environment variables.
  let storage: WorldsStorageManager;
  if (config.envs.TURSO_API_TOKEN) {
    if (!config.envs.TURSO_ORG) {
      throw new Error("TURSO_ORG is required when TURSO_API_TOKEN is set");
    }

    const tursoClient = createTursoClient({
      token: config.envs.TURSO_API_TOKEN,
      org: config.envs.TURSO_ORG,
    });
    storage = new TursoCloudWorldsStorageManager(
      system,
      tursoClient,
      vectors.dimensions,
    );
  } else {
    storage = new FileWorldsStorageManager(
      system,
      config.envs.WORLDS_BASE_DIR,
      vectors.dimensions,
    );
  }

  const context: WorldsContext = {
    vectors,
    system,
    storage,
    apiKey: config.envs.WORLDS_API_KEY,
    namespace: config.envs.WORLDS_WORLD_NAMESPACE,
    async [Symbol.asyncDispose]() {
      await this.engine?.close();
      await storage.close();
      system.close();
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
      LIBSQL_URL: Deno.env.get("LIBSQL_URL"),
      LIBSQL_AUTH_TOKEN: Deno.env.get("LIBSQL_AUTH_TOKEN"),
      TURSO_API_TOKEN: Deno.env.get("TURSO_API_TOKEN"),
      TURSO_ORG: Deno.env.get("TURSO_ORG"),
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
