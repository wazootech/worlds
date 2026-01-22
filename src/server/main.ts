import { createAppContext, createServer } from "./server.ts";

const appContext = await createAppContext({
  ADMIN_API_KEY: Deno.env.get("ADMIN_API_KEY")!,
  LIBSQL_URL: Deno.env.get("LIBSQL_URL")!,
  LIBSQL_AUTH_TOKEN: Deno.env.get("LIBSQL_AUTH_TOKEN")!,
  GOOGLE_API_KEY: Deno.env.get("GOOGLE_API_KEY")!,
  GOOGLE_EMBEDDINGS_MODEL: Deno.env.get("GOOGLE_EMBEDDINGS_MODEL")!,
});

const app = await createServer(appContext);

export default {
  fetch: (request: Request) => app.fetch(request),
} satisfies Deno.ServeDefaultExport;
