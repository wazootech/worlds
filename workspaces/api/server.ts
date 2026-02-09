import { Router } from "@fartlabs/rt";
import { createClient } from "@libsql/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AppContext } from "#/context.ts";
import { GeminiEmbeddings } from "#/lib/embeddings/gemini.ts";
import { initializeDatabase } from "#/lib/database/init.ts";
import type { DatabaseManager } from "#/lib/database/manager.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";

const routes = [
  "routes/v1/organizations/route.ts",
  "routes/v1/organizations/service-accounts/route.ts",
  "routes/v1/invites/route.ts",
  "routes/v1/worlds/route.ts",
  "routes/v1/worlds/sparql/route.ts",
  "routes/v1/worlds/logs/route.ts",
  "routes/v1/search/route.ts",
  "routes/v1/organizations/metrics/route.ts",
];

/**
 * createServer creates a server from an app context.
 */
export async function createServer(appContext: AppContext): Promise<Router> {
  const app = new Router();
  for (const specifier of routes) {
    const module = await import(`./${specifier}`);
    app.use(module.default(appContext));
  }

  return app;
}

/**
 * AppContextConfig is the configuration for an app context.
 */
export interface AppContextConfig {
  LIBSQL_URL?: string;
  LIBSQL_AUTH_TOKEN?: string;
  TURSO_API_TOKEN?: string;
  TURSO_ORG?: string;
  GOOGLE_API_KEY?: string;
  GOOGLE_EMBEDDINGS_MODEL?: string;
  ADMIN_API_KEY?: string;
}

/**
 * createAppContext creates an app context from environment variables.
 */
export async function createAppContext(
  config: AppContextConfig,
): Promise<AppContext> {
  if (!config.LIBSQL_URL) {
    console.warn("LIBSQL_URL is not set, using in-memory database");
  }

  const libsqlClient = createClient({
    url: config.LIBSQL_URL ?? ":memory:",
    authToken: config.LIBSQL_AUTH_TOKEN,
  });

  // Initialize database tables
  await initializeDatabase(libsqlClient);

  // TODO: Implement different embedding models.

  const googleGenAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY!);

  const embeddings = new GeminiEmbeddings({
    client: googleGenAI,
    dimensions: 768,

    // https://ai.google.dev/gemini-api/docs/embeddings#model-versions
    model: config.GOOGLE_EMBEDDINGS_MODEL ?? "models/gemini-embedding-001",
  });

  const worldsService = new WorldsService(libsqlClient);
  let libsqlManager: DatabaseManager;
  if (config.TURSO_API_TOKEN) {
    if (!config.TURSO_ORG) {
      throw new Error("TURSO_ORG is required when TURSO_API_TOKEN is set");
    }
    const { createClient: createTursoClient } = await import(
      "@tursodatabase/api"
    );
    const { TursoLibsqlManager } = await import(
      "#/lib/database/managers/api.ts"
    );
    const tursoClient = createTursoClient({
      token: config.TURSO_API_TOKEN,
      org: config.TURSO_ORG,
    });
    libsqlManager = new TursoLibsqlManager(tursoClient, worldsService);
  } else {
    const { FileLibsqlManager } = await import(
      "#/lib/database/managers/file.ts"
    );
    libsqlManager = new FileLibsqlManager("./database/worlds", worldsService);
  }

  return {
    embeddings,
    database: libsqlClient,
    databaseManager: libsqlManager,
    admin: {
      apiKey: config.ADMIN_API_KEY!,
    },
  };
}
