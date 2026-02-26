import type { Router } from "@fartlabs/rt";
import type { ServerContext } from "#/context.ts";
import { createServer, createServerContext } from "#/server.ts";

const serverContext: ServerContext = await createServerContext({
  envs: {
    ADMIN_API_KEY: Deno.env.get("ADMIN_API_KEY")!,
    LIBSQL_URL: Deno.env.get("LIBSQL_URL")!,
    LIBSQL_AUTH_TOKEN: Deno.env.get("LIBSQL_AUTH_TOKEN")!,
    TURSO_API_TOKEN: Deno.env.get("TURSO_API_TOKEN"),
    TURSO_ORG: Deno.env.get("TURSO_ORG"),
    OPENROUTER_API_KEY: Deno.env.get("OPENROUTER_API_KEY"),
    OPENROUTER_EMBEDDINGS_MODEL: Deno.env.get("OPENROUTER_EMBEDDINGS_MODEL"),
    OPENROUTER_EMBEDDINGS_DIMENSIONS: Deno.env.get(
      "OPENROUTER_EMBEDDINGS_DIMENSIONS",
    ),
    OLLAMA_BASE_URL: Deno.env.get("OLLAMA_BASE_URL"),
    OLLAMA_EMBEDDINGS_MODEL: Deno.env.get("OLLAMA_EMBEDDINGS_MODEL"),
    WORLDS_BASE_DIR: Deno.env.get("WORLDS_BASE_DIR"),
  },
});

const app: Router = await createServer(serverContext);

export default {
  fetch: (request: Request) => app.fetch(request),
} as Deno.ServeDefaultExport;
