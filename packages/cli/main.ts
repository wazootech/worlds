import { parseArgs } from "@std/cli/parse-args";
import { WorldsCli } from "./cli.ts";
import { createWazoo } from "./wazoo.ts";

async function main() {
  const isRemote = !!(Deno.env.get("WORLDS_BASE_URL") ||
    Deno.env.get("WORLDS_API_KEY"));
  const { sdk } = await createWazoo({ remote: isRemote });
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

    case "chat": {
      await cli.chat(commandArgs);
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
  console.log("  chat     Interactive AI chat with a world");
  console.log("");
  console.log("Environment Variables:");
  console.log("  Remote Mode:");
  console.log("    WORLDS_API_KEY   Your API key");
  console.log(
    "    WORLDS_BASE_URL  API base URL (e.g., https://api.wazoo.dev)",
  );
  console.log("  Local Mode (In-Process Server):");
  console.log(
    "    LIBSQL_URL       Database connection URL (e.g., file:worlds.db)",
  );
  console.log("    GOOGLE_API_KEY   API key for embeddings");
  console.log("");
  console.log("  AI Chat:");
  console.log("    OPENROUTER_API_KEY  OpenRouter API key");
  console.log(
    "    OPENROUTER_MODEL    Optional model (default: google/gemini-2.0-flash-001)",
  );
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err.message);
    Deno.exit(1);
  });
}
