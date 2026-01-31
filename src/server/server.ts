import { Router } from "@fartlabs/rt";
import { createClient } from "@libsql/client";
import { GoogleGenAI } from "@google/genai";
import type { AppContext } from "./app-context.ts";
import { GeminiEmbeddings } from "./embeddings/gemini.ts";
import { initializeDatabase } from "./db/init.ts";

const routes = [
  "routes/v1/tenants/route.ts",
  "routes/v1/invites/route.ts",
  "routes/v1/worlds/route.ts",
  "routes/v1/worlds/sparql/route.ts",
  "routes/v1/search/route.ts",
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

  const googleGenAI = new GoogleGenAI({
    apiKey: config.GOOGLE_API_KEY,
  });

  const embeddings = new GeminiEmbeddings({
    client: googleGenAI,
    dimensions: 768,

    // https://ai.google.dev/gemini-api/docs/embeddings#model-versions
    model: config.GOOGLE_EMBEDDINGS_MODEL ?? "models/gemini-embedding-001",
  });

  return {
    embeddings,
    libsqlClient,
    admin: {
      apiKey: config.ADMIN_API_KEY!,
    },
  };
}
