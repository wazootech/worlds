import { WorldsSdk } from "@wazoo/worlds-sdk";
import { createServer, createServerContext } from "@wazoo/worlds-server";

/**
 * createWazoo creates a new Wazoo SDK.
 */
export async function createWazoo(): Promise<{ sdk: WorldsSdk }> {
  const remoteBaseUrl = Deno.env.get("WORLDS_BASE_URL");
  const remoteApiKey = Deno.env.get("WORLDS_API_KEY");
  if (remoteBaseUrl && remoteApiKey) {
    const sdk = new WorldsSdk({
      apiKey: remoteApiKey,
      baseUrl: remoteBaseUrl,
    });
    return { sdk };
  }

  const localApiKey = Deno.env.get("ADMIN_API_KEY") ??
    crypto.randomUUID();

  const serverContext = await createServerContext({
    envs: {
      ADMIN_API_KEY: localApiKey,
      LIBSQL_URL: Deno.env.get("LIBSQL_URL"),
      LIBSQL_AUTH_TOKEN: Deno.env.get("LIBSQL_AUTH_TOKEN"),
      TURSO_API_TOKEN: Deno.env.get("TURSO_API_TOKEN"),
      TURSO_ORG: Deno.env.get("TURSO_ORG"),
      OPENROUTER_API_KEY: Deno.env.get("OPENROUTER_API_KEY"),
      OPENROUTER_EMBEDDINGS_MODEL: Deno.env.get("OPENROUTER_EMBEDDINGS_MODEL"),
      OPENROUTER_EMBEDDINGS_DIMENSIONS: Deno.env.get(
        "OPENROUTER_EMBEDDINGS_DIMENSIONS",
      ),
      OLLAMA_BASE_URL: Deno.env.get("OLLAMA_BASE_URL"),
      OLLAMA_EMBEDDINGS_MODEL: Deno.env.get("OLLAMA_EMBEDDINGS_MODEL"),
    },
  });

  const server = createServer(serverContext);
  const sdk = new WorldsSdk({
    apiKey: localApiKey,
    baseUrl: "http://localhost",
    fetch: (input, init) => server.fetch(new Request(input, init)),
  });

  return { sdk };
}
