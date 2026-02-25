import { promptSecret } from "@std/cli/prompt-secret";
import { WorldsSdk } from "@wazoo/worlds-sdk";
import { createServer, createServerContext } from "@wazoo/worlds-server";

/**
 * CreateWazooOptions are options for creating a new Wazoo SDK.
 */
export interface CreateWazooOptions {
  remote?: boolean;
}

/**
 * createWazoo creates a new Wazoo SDK.
 */
export async function createWazoo(
  options: CreateWazooOptions,
): Promise<{ sdk: WorldsSdk }> {
  if (options.remote) {
    const baseUrl = Deno.env.get("WORLDS_BASE_URL") ??
      "https://api.wazoo.dev";
    const apiKey = Deno.env.get("WORLDS_API_KEY") ??
      promptSecret("Worlds API key: ");
    if (!apiKey) {
      console.error("WORLDS_API_KEY environment variable is not set.");
      Deno.exit(1);
    }

    const sdk = new WorldsSdk({ apiKey, baseUrl });
    return { sdk };
  }

  const apiKey = Deno.env.get("ADMIN_API_KEY") ??
    crypto.randomUUID();

  const serverContext = await createServerContext({
    env: {
      ADMIN_API_KEY: apiKey,
      LIBSQL_URL: Deno.env.get("LIBSQL_URL")!,
      LIBSQL_AUTH_TOKEN: Deno.env.get("LIBSQL_AUTH_TOKEN")!,
      TURSO_API_TOKEN: Deno.env.get("TURSO_API_TOKEN"),
      TURSO_ORG: Deno.env.get("TURSO_ORG"),
      GOOGLE_API_KEY: Deno.env.get("GOOGLE_API_KEY"),
      GOOGLE_EMBEDDINGS_MODEL: Deno.env.get("GOOGLE_EMBEDDINGS_MODEL"),
    },
  });

  const server = createServer(serverContext);
  const baseUrl = "http://localhost";
  const sdk = new WorldsSdk({
    apiKey,
    baseUrl,
    fetch: (input, init) => server.fetch(new Request(input, init)),
  });

  return { sdk };
}
