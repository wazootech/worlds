import type { ServerContext } from "#/context.ts";
import type { DatabaseManager } from "#/lib/database/manager.ts";
import { Router } from "@fartlabs/rt";
import { createClient } from "@libsql/client";
import { createOllama } from "ollama-ai-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";
import { OllamaEmbeddings } from "#/lib/embeddings/ollama.ts";
import { OpenRouterEmbeddings } from "#/lib/embeddings/openrouter.ts";
import { initializeDatabase } from "#/lib/database/init.ts";
import { createClient as createTursoClient } from "@tursodatabase/api";
import { TursoDatabaseManager } from "#/lib/database/managers/api.ts";
import { FileDatabaseManager } from "#/lib/database/managers/file.ts";
import { dirname } from "@std/path";

import worldsRouter from "./routes/v1/worlds/route.ts";
import sparqlRouter from "./routes/v1/worlds/sparql/route.ts";
import logsRouter from "./routes/v1/worlds/logs/route.ts";
import searchRouter from "./routes/v1/worlds/search/route.ts";

// TODO: Worlds router should contain all sub-routers.
const routes = [
  worldsRouter,
  sparqlRouter,
  logsRouter,
  searchRouter,
];

/**
 * createServer creates a server from an app context.
 */
export function createServer(appContext: ServerContext): Router {
  const app = new Router();
  for (const router of routes) {
    app.use(router(appContext));
  }

  return app;
}

/**
 * ServerContextConfig is the configuration for an app context.
 */
export interface ServerContextConfig {
  envs: {
    LIBSQL_URL?: string;
    LIBSQL_AUTH_TOKEN?: string;
    TURSO_API_TOKEN?: string;
    TURSO_ORG?: string;
    OPENROUTER_API_KEY?: string;
    OPENROUTER_EMBEDDINGS_MODEL?: string;
    OPENROUTER_EMBEDDINGS_DIMENSIONS?: string;
    OLLAMA_BASE_URL?: string;
    OLLAMA_EMBEDDINGS_MODEL?: string;
    ADMIN_API_KEY?: string;
    WORLDS_BASE_DIR?: string;
  };
}

/**
 * createServerContext creates an app context from environment variables.
 */
export async function createServerContext(
  config: ServerContextConfig,
): Promise<ServerContext> {
  if (!config.envs.ADMIN_API_KEY) {
    throw new Error("ADMIN_API_KEY is required");
  }

  // TODO: Set up Embedded Replicas config.

  if (config.envs.LIBSQL_URL?.startsWith("file:")) {
    const dbPath = config.envs.LIBSQL_URL.slice(5); // Remove "file:"
    await Deno.mkdir(dirname(dbPath), { recursive: true });
  }

  // Resolve database strategy based on environment variables.
  const database = createClient({
    url: config.envs.LIBSQL_URL!,
    authToken: config.envs.LIBSQL_AUTH_TOKEN,
  });

  // Initialize database tables.
  await initializeDatabase(database);

  // Resolve embeddings strategy based on environment variables.
  let embeddings: Embeddings;
  if (config.envs.OPENROUTER_API_KEY) {
    const openrouter = createOpenRouter({
      apiKey: config.envs.OPENROUTER_API_KEY,
    });
    const dimensions = parseInt(
      config.envs.OPENROUTER_EMBEDDINGS_DIMENSIONS ?? "768",
    );
    embeddings = new OpenRouterEmbeddings({
      model: openrouter.textEmbeddingModel(
        config.envs.OPENROUTER_EMBEDDINGS_MODEL ??
          "openai/text-embedding-3-small",
      ),
      dimensions,
    });
  } else {
    const ollama = createOllama({
      baseURL: config.envs.OLLAMA_BASE_URL,
    });
    embeddings = new OllamaEmbeddings({
      model: ollama.textEmbeddingModel(
        config.envs.OLLAMA_EMBEDDINGS_MODEL ?? "nomic-embed-text",
      ),
      dimensions: 768,
    });
  }

  // Resolve database manager strategy based on environment variables.
  let manager: DatabaseManager;
  if (config.envs.TURSO_API_TOKEN) {
    if (!config.envs.TURSO_ORG) {
      throw new Error("TURSO_ORG is required when TURSO_API_TOKEN is set");
    }

    const tursoClient = createTursoClient({
      token: config.envs.TURSO_API_TOKEN,
      org: config.envs.TURSO_ORG,
    });
    manager = new TursoDatabaseManager(
      database,
      tursoClient,
      embeddings.dimensions,
    );
  } else {
    manager = new FileDatabaseManager(
      database,
      config.envs.WORLDS_BASE_DIR ?? "./worlds",
      embeddings.dimensions,
    );
  }

  return {
    embeddings,
    libsql: { database, manager },
    admin: {
      apiKey: config.envs.ADMIN_API_KEY,
    },
  };
}
