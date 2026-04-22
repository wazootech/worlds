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
 * WorldsContext represents the global shared state for a Worlds engine.
 */
export interface WorldsContext {
  /**
   * embeddings provides a vector embeddings implementation.
   */
  embeddings: Embeddings;

  /**
   * apiKey is the active administrative API key.
   */
  apiKey: string;

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
   * id is the default world identifier for this context.
   */
  id?: string;

  /**
   * engine is the initialized Worlds engine for this context.
   */
  engine?: WorldsEngine;

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
    LIBSQL_URL?: string;
    LIBSQL_AUTH_TOKEN?: string;
    TURSO_API_TOKEN?: string;
    TURSO_ORG?: string;
    WORLDS_BASE_DIR?: string;
  };
}

/**
 * createWorldsContext initializes a new global engine context.
 */
export function createWorldsContext(
  config?: WorldsContextConfig,
): Promise<WorldsContext> {
  const finalConfig: WorldsContextConfig = {
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
    apiKey: finalConfig.envs.WORLDS_API_KEY || "",
    namespace: finalConfig.envs.WORLDS_NS,
    async [Symbol.asyncDispose]() {
      await storage.close();
    },
  };

  return Promise.resolve(context);
}

/**
 * createWorlds initializes a standalone root Worlds engine instance.
 */
export async function createWorlds(
  contextOrOptions?: WorldsContext | WorldsOptions,
): Promise<WorldsEngine> {
  // Check if it's a context (has management property)
  if (
    contextOrOptions && "management" in contextOrOptions &&
    contextOrOptions.management
  ) {
    const context = contextOrOptions as WorldsContext;
    const engineOptions: WorldsEngineOptions = {
      storeEngine: context.storage,
      management: context.management,
      embeddings: context.embeddings,
      namespace: context.namespace,
      id: context.id,
    };
    const engine = new Worlds(engineOptions);
    context.engine = engine; // Attach engine to context
    return engine;
  }

  // Fallback to client-only mode or remote SDK
  const options = contextOrOptions as WorldsOptions | undefined;
  if (options?.baseUrl) {
    return new WorldsClient(options) as unknown as WorldsEngine;
  }

  // Initialize a default local context if nothing else provided
  const context = await createWorldsContext();
  const engineOptions: WorldsEngineOptions = {
    storeEngine: context.storage,
    management: context.management,
    embeddings: context.embeddings,
    namespace: context.namespace,
    id: context.id,
  };
  const engine = new Worlds(engineOptions);
  context.engine = engine;
  return engine;
}

export type { WorldsEngine };
