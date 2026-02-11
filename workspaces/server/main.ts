import type { Router } from "@fartlabs/rt";
import { createAppContext, createServer } from "#/server.ts";
import type { AppContext } from "#/context.ts";

const appContext: AppContext = await createAppContext({
  env: {
    ADMIN_API_KEY: Deno.env.get("ADMIN_API_KEY")!,
    LIBSQL_URL: Deno.env.get("LIBSQL_URL")!,
    LIBSQL_AUTH_TOKEN: Deno.env.get("LIBSQL_AUTH_TOKEN")!,
    TURSO_API_TOKEN: Deno.env.get("TURSO_API_TOKEN"),
    TURSO_ORG: Deno.env.get("TURSO_ORG"),
    GOOGLE_API_KEY: Deno.env.get("GOOGLE_API_KEY")!,
    GOOGLE_EMBEDDINGS_MODEL: Deno.env.get("GOOGLE_EMBEDDINGS_MODEL")!,
  },
});

const app: Router = await createServer(appContext);

export default {
  fetch: (request: Request) => app.fetch(request),
} as Deno.ServeDefaultExport;
