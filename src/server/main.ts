import { Router } from "@fartlabs/rt";
import type { AppContext } from "./app-context.ts";
import { createClient } from "@libsql/client";
import { GoogleGenAI } from "@google/genai";
import { GoogleGenAIEmbeddings } from "./embeddings/google-genai.ts";
import { createWorldsKvdex } from "./db/kvdex.ts";

const kv = await Deno.openKv(Deno.env.get("DENO_KV_PATH"));
const db = createWorldsKvdex(kv);

const url = Deno.env.get("LIBSQL_URL");
const authToken = Deno.env.get("LIBSQL_AUTH_TOKEN");
const googleApiKey = Deno.env.get("GOOGLE_API_KEY");

const client = url
  ? createClient({ url, authToken })
  : createClient({ url: ":memory:" });

const embedder = googleApiKey
  ? new GoogleGenAIEmbeddings({
    client: new GoogleGenAI({ apiKey: googleApiKey }),
    model: "models/gemini-embedding-001",
    dimensions: 768,
  })
  : {
    embed: (_: string) => Promise.resolve(new Array(768).fill(0)),
    dimensions: 768,
  };

const apiKey = Deno.env.get("ADMIN_API_KEY");
if (!apiKey) {
  throw new Error("ADMIN_API_KEY is not set");
}

const appContext: AppContext = {
  db,
  kv,
  admin: { apiKey },
  libsqlClient: client,
  embeddings: embedder,
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
