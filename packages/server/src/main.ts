import type { Router } from "@fartlabs/rt";
import type { WorldsRegistry } from "@wazoo/worlds-sdk";
import { createServer } from "./server.ts";
import { initRegistry } from "@wazoo/worlds-sdk";

const registry: WorldsRegistry = await initRegistry({
  envs: {
    WORLDS_API_KEY: Deno.env.get("WORLDS_API_KEY"),
    LIBSQL_URL: Deno.env.get("LIBSQL_URL") ?? undefined,
    LIBSQL_AUTH_TOKEN: Deno.env.get("LIBSQL_AUTH_TOKEN"),
    TURSO_API_TOKEN: Deno.env.get("TURSO_API_TOKEN"),
    TURSO_ORG: Deno.env.get("TURSO_ORG"),
    OPENROUTER_API_KEY: Deno.env.get("OPENROUTER_API_KEY"),
    OPENROUTER_EMBEDDINGS_MODEL: Deno.env.get("OPENROUTER_EMBEDDINGS_MODEL"),
    OLLAMA_BASE_URL: Deno.env.get("OLLAMA_BASE_URL"),
    OLLAMA_EMBEDDINGS_MODEL: Deno.env.get("OLLAMA_EMBEDDINGS_MODEL"),
    WORLDS_EMBEDDINGS_DIMENSIONS: Deno.env.get("WORLDS_EMBEDDINGS_DIMENSIONS"),
    WORLDS_BASE_DIR: Deno.env.get("WORLDS_BASE_DIR"),
  },
});

const app: Router = await createServer(registry);

export default {
  fetch: (request: Request) => app.fetch(request),
} as Deno.ServeDefaultExport;
