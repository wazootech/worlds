import { parseArgs } from "@std/cli/parse-args";
import { promptSecret } from "@std/cli/prompt-secret";
import { WorldsSdk } from "@wazoo/sdk";
import { createServer, createServerContext } from "@wazoo/server";
import { WorldsCli } from "./cli.ts";

async function main() {
  const baseUrl = Deno.env.get("WORLDS_BASE_URL") ??
    "https://api.wazoo.dev";

  let fetch: typeof globalThis.fetch | undefined;
  if (baseUrl.startsWith("./") || baseUrl.startsWith("file:")) {
    const serverContext = await createServerContext({
      env: {
        ADMIN_API_KEY: Deno.env.get("ADMIN_API_KEY")!,
        LIBSQL_URL: Deno.env.get("LIBSQL_URL")!,
        LIBSQL_AUTH_TOKEN: Deno.env.get("LIBSQL_AUTH_TOKEN")!,
        TURSO_API_TOKEN: Deno.env.get("TURSO_API_TOKEN"),
        TURSO_ORG: Deno.env.get("TURSO_ORG"),
        GOOGLE_API_KEY: Deno.env.get("GOOGLE_API_KEY"),
        GOOGLE_EMBEDDINGS_MODEL: Deno.env.get("GOOGLE_EMBEDDINGS_MODEL"),
      },
    });

    const app = await createServer(serverContext);
    fetch = (input: RequestInfo | URL, init?: RequestInit) =>
      app.fetch(new Request(input, init));
  }

  const apiKey = Deno.env.get("WORLDS_API_KEY") ??
    promptSecret("Worlds API key: ");
  if (!apiKey) {
    console.error("WORLDS_API_KEY environment variable is not set.");
    Deno.exit(1);
  }

  const sdk = new WorldsSdk({ apiKey, baseUrl, fetch });
  const cli = new WorldsCli(sdk);

  if (Deno.args.length === 0) {
    WorldsCli.logo();
    showHelp();
    Deno.exit(0);
  }

  const [command, ...commandArgs] = Deno.args;

  switch (command) {
    case "create": {
      await cli.create(commandArgs);
      break;
    }

    case "update": {
      await cli.update(commandArgs);
      break;
    }

    case "delete": {
      await cli.delete(commandArgs);
      break;
    }

    case "list": {
      await cli.list(commandArgs);
      break;
    }

    case "get": {
      await cli.get(commandArgs);
      break;
    }
    case "search": {
      await cli.search(commandArgs);
      break;
    }

    case "sparql": {
      await cli.sparql(commandArgs);
      break;
    }

    case "import": {
      await cli.import(commandArgs);
      break;
    }

    case "export": {
      await cli.export(commandArgs);
      break;
    }

    default: {
      const parsedArgs = parseArgs(Deno.args, {
        boolean: "help",
        alias: { h: "help" },
      });

      if (parsedArgs.help) {
        WorldsCli.logo();
        showHelp();
        Deno.exit(0);
      }

      console.error(`Unknown command: ${command}`);
      Deno.exit(1);
    }
  }
}

function showHelp() {
  console.log("Usage: worlds <command> [options]");
  console.log("");
  console.log("Commands:");
  console.log("  create   Create a new world");
  console.log("  update   Update an existing world");
  console.log("  delete   Delete a world");
  console.log("  list     List worlds");
  console.log("  get      Get a world by ID");
  console.log("  search   Search within a world");
  console.log("  sparql   Execute a SPARQL query");
  console.log("  import   Import data into a world");
  console.log("  export   Export data from a world");
  console.log("");
  console.log("Environment Variables:");
  console.log("  WORLDS_API_KEY   Your API key");
  console.log("  WORLDS_BASE_URL  Optional API base URL");
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err.message);
    Deno.exit(1);
  });
}
