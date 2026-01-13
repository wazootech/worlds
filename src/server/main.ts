import { Router } from "@fartlabs/rt";
import { createClient } from "@libsql/client";
import { GoogleGenAI } from "@google/genai";
import type { AppContext } from "./app-context.ts";
import { createWorldsKvdex } from "./db/kvdex.ts";
import { GoogleGenAIEmbeddings } from "./embeddings/google-genai.ts";

const kv = await Deno.openKv(Deno.env.get("DENO_KV_PATH"));
const db = createWorldsKvdex(kv);

const libsqlClient = createClient({
  url: Deno.env.get("LIBSQL_URL")!,
  authToken: Deno.env.get("LIBSQL_AUTH_TOKEN")!,
});

const googleGenAI = new GoogleGenAI({
  apiKey: Deno.env.get("GOOGLE_API_KEY")!,
});

const embeddings = new GoogleGenAIEmbeddings({
  client: googleGenAI,
  dimensions: 768,

  // https://ai.google.dev/gemini-api/docs/embeddings#model-versions
  model: "models/gemini-embedding-001",
});

const apiKey = Deno.env.get("ADMIN_API_KEY");
if (!apiKey) {
  throw new Error("ADMIN_API_KEY is not set");
}

const appContext: AppContext = {
  kv,
  db,
  embeddings,
  libsqlClient,
  admin: { apiKey },
};

const routes = [
  "routes/v1/accounts/route.ts",
  "routes/v1/plans/route.ts",
  "routes/v1/worlds/route.ts",
  "routes/v1/worlds/sparql/route.ts",
  "routes/v1/worlds/search/route.ts",
  "routes/v1/worlds/usage/route.ts",
];

const app = new Router();

for (const specifier of routes) {
  const module = await import(`./${specifier}`);
  app.use(module.default(appContext));
}

export default {
  fetch: (request: Request) => app.fetch(request),
} satisfies Deno.ServeDefaultExport;
