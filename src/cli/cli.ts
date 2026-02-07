import { parseArgs } from "@std/cli/parse-args";
import { promptSecret } from "@std/cli/prompt-secret";
import { render } from "cfonts";
import { WorldsSdk } from "#/sdk/sdk.ts";
import type { RdfFormat } from "#/sdk/worlds/schema.ts";

/**
 * WorldsCli is a command line application for the Worlds API.
 */
export class WorldsCli {
  public constructor(private readonly sdk: WorldsSdk) {}

  public static logTitle() {
    const renderResult = render("Worlds CLI", {
      colors: ["#d97706"],
      gradient: ["#d97706", "#f59e0b"],
      independentGradient: true,
      transitionGradient: true,
    });
    if (!renderResult) {
      return;
    }

    console.log(renderResult.string);
  }

  public static async main() {
    const apiKey = Deno.env.get("WORLDS_API_KEY") ??
      promptSecret("Worlds API key: ");
    if (!apiKey) {
      console.error("WORLDS_API_KEY environment variable is not set.");
      Deno.exit(1);
    }

    if (Deno.args.length === 0) {
      WorldsCli.logTitle();
      console.log("Usage: worlds <command> <options>");
      console.log(
        "Commands: create, update, delete, list, get, search, sparql, import, export",
      );
      Deno.exit(0);
    }

    const baseUrl = Deno.env.get("WORLDS_BASE_URL") ??
      "https://worlds.wazoo.tech";
    const sdk = new WorldsSdk({ apiKey, baseUrl });
    const cli = new WorldsCli(sdk);
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
          WorldsCli.logTitle();
          console.log("Usage: worlds <command> <options>");
          console.log(
            "Commands: create, update, delete, list, get, search, sparql, import, export",
          );
          Deno.exit(0);
        }

        console.error(`Unknown command: ${command}`);
        Deno.exit(1);
      }
    }
  }

  public async create(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["organizationId", "label", "description"],
      alias: { o: "organizationId", l: "label", d: "description", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logTitle();
      console.log(
        "Usage: worlds create --label <label> [--organizationId <id>] [--description <desc>]",
      );
      return;
    }

    if (!parsed.label) {
      console.error(
        "Usage: worlds create --label <label> [--organizationId <id>] [--description <desc>]",
      );
      return;
    }
    const world = await this.sdk.worlds.create({
      organizationId: parsed.organizationId,
      label: parsed.label,
      description: parsed.description,
    });
    console.log(JSON.stringify(world, null, 2));
  }

  public async update(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["label", "description"],
      alias: { l: "label", d: "description", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logTitle();
      console.log(
        "Usage: worlds update <worldId> [--label <label>] [--description <desc>]",
      );
      return;
    }
    const worldId = parsed._[0] as string;
    if (!worldId) {
      console.error(
        "Usage: worlds update <worldId> [--label <label>] [--description <desc>]",
      );
      return;
    }
    await this.sdk.worlds.update(worldId, {
      label: parsed.label,
      description: parsed.description,
    });
    console.log(`Updated world ${worldId}`);
  }

  public async delete(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      alias: { h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logTitle();
      console.log("Usage: worlds delete <worldId>");
      return;
    }

    const worldId = parsed._[0] as string;
    if (!worldId) {
      console.error("Usage: worlds delete <worldId>");
      return;
    }
    await this.sdk.worlds.delete(worldId);
    console.log(`Deleted world ${worldId}`);
  }

  public async list(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["organizationId", "page", "pageSize"],
      alias: { o: "organizationId", p: "page", s: "pageSize", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logTitle();
      console.log(
        "Usage: worlds list [--organizationId <id>] [--page <n>] [--pageSize <n>]",
      );
      return;
    }
    const worlds = await this.sdk.worlds.list(
      parsed.page ? parseInt(parsed.page as string) : undefined,
      parsed.pageSize ? parseInt(parsed.pageSize as string) : undefined,
      { organizationId: parsed.organizationId },
    );
    console.log(JSON.stringify(worlds, null, 2));
  }

  public async get(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      alias: { h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logTitle();
      console.log("Usage: worlds get <worldId>");
      return;
    }

    const worldId = parsed._[0] as string;
    if (!worldId) {
      console.error("Usage: worlds get <worldId>");
      return;
    }
    const world = await this.sdk.worlds.get(worldId);
    console.log(JSON.stringify(world, null, 2));
  }

  public async search(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["query", "subjects", "predicates", "limit"],
      alias: {
        q: "query",
        s: "subjects",
        p: "predicates",
        l: "limit",
        h: "help",
      },
      collect: ["subjects", "predicates"],
    });

    if (parsed.help) {
      WorldsCli.logTitle();
      console.log(
        "Usage: worlds search <worldId> <query> [--limit <n>] [--subjects <s1> --subjects <s2>]",
      );
      return;
    }
    const worldId = parsed._[0] as string;
    const query = parsed.query || (parsed._[1] as string);
    if (!worldId || !query) {
      console.error(
        "Usage: worlds search <worldId> <query> [--limit <n>] [--subjects <s1> --subjects <s2>]",
      );
      return;
    }
    const results = await this.sdk.worlds.search(worldId, query, {
      limit: parsed.limit ? parseInt(parsed.limit as string) : undefined,
      subjects: parsed.subjects,
      predicates: parsed.predicates,
    });
    console.log(JSON.stringify(results, null, 2));
  }

  public async sparql(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      alias: { h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logTitle();
      console.log("Usage: worlds sparql <worldId> <query_or_file_path>");
      return;
    }

    const worldId = parsed._[0] as string;
    const queryOrPath = parsed._[1] as string;
    if (!worldId || !queryOrPath) {
      console.error("Usage: worlds sparql <worldId> <query_or_file_path>");
      return;
    }

    let query = queryOrPath;
    try {
      query = await Deno.readTextFile(queryOrPath);
    } catch {
      // Not a file, use as query string
    }

    const results = await this.sdk.worlds.sparql(worldId, query);
    console.log(JSON.stringify(results, null, 2));
  }

  public async import(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["format"],
      alias: { f: "format", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logTitle();
      console.log(
        "Usage: worlds import <worldId> <file_path> [--format <turtle|n-quads|...>]",
      );
      return;
    }
    const worldId = parsed._[0] as string;
    const path = parsed._[1] as string;
    if (!worldId || !path) {
      console.error(
        "Usage: worlds import <worldId> <file_path> [--format <turtle|n-quads|...>]",
      );
      return;
    }
    const data = await Deno.readFile(path);
    await this.sdk.worlds.import(worldId, data.buffer as ArrayBuffer, {
      format: parsed.format as RdfFormat,
    });
    console.log(`Imported data into world ${worldId}`);
  }

  public async export(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["format"],
      alias: { f: "format", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logTitle();
      console.log(
        "Usage: worlds export <worldId> [--format <turtle|n-quads|...>]",
      );
      return;
    }
    const worldId = parsed._[0] as string;
    if (!worldId) {
      console.error(
        "Usage: worlds export <worldId> [--format <turtle|n-quads|...>]",
      );
      return;
    }
    const buffer = await this.sdk.worlds.export(worldId, {
      format: parsed.format as RdfFormat,
    });
    await Deno.stdout.write(new Uint8Array(buffer));
  }
}
