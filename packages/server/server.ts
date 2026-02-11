import type { ServerContext } from "#/context.ts";
import type { DatabaseManager } from "#/lib/database/manager.ts";
import { Router } from "@fartlabs/rt";
import { createClient } from "@libsql/client";
import { GoogleGenAI } from "@google/genai";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";
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
 * createServerContext creates an app context from environment variables.
 */
export async function createServerContext(
  config: ServerContextConfig,
): Promise<ServerContext> {
  if (!config.env.ADMIN_API_KEY) {
    throw new Error("ADMIN_API_KEY is required");
  }

  // TODO: Set up Embedded Replicas config.

  // Resolve database strategy based on environment variables.
  const database = createClient({
    url: config.env.LIBSQL_URL!,
    authToken: config.env.LIBSQL_AUTH_TOKEN,
  });

  // Initialize database tables.
  await initializeDatabase(database);

  // Resolve database manager strategy based on environment variables.
  let manager: DatabaseManager;
  if (config.env.TURSO_API_TOKEN) {
    if (!config.env.TURSO_ORG) {
      throw new Error("TURSO_ORG is required when TURSO_API_TOKEN is set");
    }

    const tursoClient = createTursoClient({
      token: config.env.TURSO_API_TOKEN,
      org: config.env.TURSO_ORG,
    });
    manager = new TursoDatabaseManager(database, tursoClient);
  } else {
    manager = new FileDatabaseManager(database, "./worlds");
  }

  // Resolve embeddings strategy based on environment variables.
  let embeddings: Embeddings;
  if (config.env.GOOGLE_API_KEY) {
    const genai = new GoogleGenAI({ apiKey: config.env.GOOGLE_API_KEY! });
    embeddings = new GeminiEmbeddings({
      client: genai,
      dimensions: 768,

      // https://ai.google.dev/gemini-api/docs/embeddings#model-versions
      model: config.env.GOOGLE_EMBEDDINGS_MODEL ??
        "models/gemini-embedding-001",
    });
  } else {
    const { UniversalSentenceEncoderEmbeddings } = await import(
      "#/lib/embeddings/use.ts"
    );
    embeddings = new UniversalSentenceEncoderEmbeddings();
  }

  return {
    embeddings,
    libsql: { database, manager },
    admin: {
      apiKey: config.env.ADMIN_API_KEY,
    },
  };
}
