import type { AppContext } from "#/context.ts";
import type { DatabaseManager } from "#/lib/database/manager.ts";
import { Router } from "@fartlabs/rt";
import { createClient } from "@libsql/client";
import { GoogleGenAI } from "@google/genai";
import { GeminiEmbeddings } from "#/lib/embeddings/gemini.ts";
import { initializeDatabase } from "#/lib/database/init.ts";
import { createClient as createTursoClient } from "@tursodatabase/api";
import { TursoDatabaseManager } from "#/lib/database/managers/api.ts";
import { FileDatabaseManager } from "#/lib/database/managers/file.ts";

import organizationsRouter from "./routes/v1/organizations/route.ts";
import serviceAccountsRouter from "./routes/v1/organizations/service-accounts/route.ts";
import invitesRouter from "./routes/v1/invites/route.ts";
import worldsRouter from "./routes/v1/worlds/route.ts";
import sparqlRouter from "./routes/v1/worlds/sparql/route.ts";
import logsRouter from "./routes/v1/worlds/logs/route.ts";
import searchRouter from "./routes/v1/worlds/search/route.ts";
import metricsRouter from "./routes/v1/organizations/metrics/route.ts";

const routes = [
  organizationsRouter,
  serviceAccountsRouter,
  invitesRouter,
  worldsRouter,
  sparqlRouter,
  logsRouter,
  searchRouter,
  metricsRouter,
];

/**
 * createServer creates a server from an app context.
 */
export function createServer(appContext: AppContext): Router {
  const app = new Router();
  for (const router of routes) {
    app.use(router(appContext));
  }

  return app;
}

/**
 * AppContextConfig is the configuration for an app context.
 */
export interface AppContextConfig {
  env: {
    LIBSQL_URL?: string;
    LIBSQL_AUTH_TOKEN?: string;
    TURSO_API_TOKEN?: string;
    TURSO_ORG?: string;
    GOOGLE_API_KEY?: string;
    GOOGLE_EMBEDDINGS_MODEL?: string;
    ADMIN_API_KEY?: string;
  };
}

/**
 * createAppContext creates an app context from environment variables.
 */
export async function createAppContext(
  config: AppContextConfig,
): Promise<AppContext> {
  if (!config.env.LIBSQL_URL) {
    console.warn("LIBSQL_URL is not set, using in-memory database");
  }

  const database = createClient({
    url: config.env.LIBSQL_URL ?? ":memory:",
    authToken: config.env.LIBSQL_AUTH_TOKEN,
  });

  // Initialize database tables
  await initializeDatabase(database);

  // TODO: Implement different embedding models.

  const googleGenAI = new GoogleGenAI({ apiKey: config.env.GOOGLE_API_KEY! });

  const embeddings = new GeminiEmbeddings({
    client: googleGenAI,
    dimensions: 768,

    // https://ai.google.dev/gemini-api/docs/embeddings#model-versions
    model: config.env.GOOGLE_EMBEDDINGS_MODEL ?? "models/gemini-embedding-001",
  });

  let databaseManager: DatabaseManager;
  if (config.env.TURSO_API_TOKEN) {
    if (!config.env.TURSO_ORG) {
      throw new Error("TURSO_ORG is required when TURSO_API_TOKEN is set");
    }
    const tursoClient = createTursoClient({
      token: config.env.TURSO_API_TOKEN,
      org: config.env.TURSO_ORG,
    });
    databaseManager = new TursoDatabaseManager(database, tursoClient);
  } else {
    databaseManager = new FileDatabaseManager(database, "./database/worlds");
  }

  return {
    embeddings,
    libsql: {
      database,
      manager: databaseManager,
    },
    admin: {
      apiKey: config.env.ADMIN_API_KEY!,
    },
  };
}
