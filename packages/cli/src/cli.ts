import type { ModelMessage } from "ai";
import type { Worlds, WorldsContentType } from "@wazoo/worlds-sdk";
import { parseArgs } from "@std/cli/parse-args";
import { Spinner } from "@std/cli/unstable-spinner";
import { render } from "cfonts";
import { stepCountIs, streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createTools } from "@wazoo/worlds-ai-sdk";

/**
 * WorldsCli is a command line application for the Worlds API.
 */
export class WorldsCli {
  public constructor(private readonly worlds: Worlds) {}

  public static logo() {
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

  /**
   * create a new world with a label, slug, and description.
   */
  public async create(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["label", "description", "slug"],
      alias: {
        l: "label",
        d: "description",
        s: "slug",
        h: "help",
      },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds create --label <label> [--slug <slug>] [--description <desc>]",
      );
      return;
    }

    if (!parsed.label) {
      console.error(
        "Usage: worlds create --label <label> [--slug <slug>] [--description <desc>]",
      );
      return;
    }

    const slug = parsed.slug ||
      parsed.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
        /^-+|-+$/g,
        "",
      );

    const world = await this.worlds.create({
      slug,
      label: parsed.label,
      description: parsed.description,
    });
    console.log(JSON.stringify(world, null, 2));
  }

  /**
   * update an existing world's metadata.
   */
  public async update(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["slug", "label", "description"],
      alias: { s: "slug", l: "label", d: "description", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds update --slug <slug> [--label <label>] [--description <desc>]",
      );
      return;
    }
    const slug = parsed.slug as string;
    if (!slug) {
      console.error(
        "Usage: worlds update --slug <slug> [--label <label>] [--description <desc>]",
      );
      return;
    }
    await this.worlds.update({
      source: slug,
      label: parsed.label,
      description: parsed.description,
    });
    console.log(`Updated world ${slug}`);
  }

  /**
   * delete a world by its ID.
   */
  public async delete(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["slug"],
      alias: { s: "slug", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log("Usage: worlds delete --slug <slug>");
      return;
    }

    const slug = parsed.slug as string;
    if (!slug) {
      console.error("Usage: worlds delete --slug <slug>");
      return;
    }

    await this.worlds.delete({ source: slug });
    console.log(`Deleted world ${slug}`);
  }

  /**
   * list worlds with pagination support.
   */
  public async list(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["page", "page-size"],
      alias: { p: "page", s: "page-size", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds list [--page <n>] [--page-size <n>]",
      );
      return;
    }
    const worlds = await this.worlds.list({
      page: parsed.page ? parseInt(parsed.page as string) : undefined,
      pageSize: parsed["page-size"]
        ? parseInt(parsed["page-size"] as string)
        : undefined,
    });
    console.log(JSON.stringify(worlds, null, 2));
  }

  /**
   * get a specific world's details by ID.
   */
  public async get(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["world"],
      alias: { w: "world", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log("Usage: worlds get --world <id>");
      return;
    }

    const world = parsed.world as string;
    if (!world) {
      console.error("Usage: worlds get --world <id>");
      return;
    }
    const worldObj = await this.worlds.get({ source: world });
    console.log(JSON.stringify(worldObj, null, 2));
  }

  /**
   * search for entities within a world's knowledge graph.
   */
  public async search(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["slug", "query", "subjects", "predicates", "limit"],
      alias: {
        s: "slug",
        q: "query",
        subj: "subjects",
        p: "predicates",
        l: "limit",
        h: "help",
      },
      collect: ["subjects", "predicates"],
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds search [--slug <id>] --query <string> [--limit <n>] [--subjects <s1> --subjects <s2>]",
      );
      return;
    }
    const slug = (parsed.slug as string) || "_";
    const query = parsed.query as string;
    if (!query) {
      console.error(
        "Usage: worlds search [--slug <id>] --query <string> [--limit <n>] [--subjects <s1> --subjects <s2>]",
      );
      return;
    }
    const results = await this.worlds.search({
      sources: [slug],
      query,
      limit: parsed.limit ? parseInt(parsed.limit as string) : undefined,
      subjects: parsed.subjects as string[] | undefined,
      predicates: parsed.predicates as string[] | undefined,
    });
    console.log(JSON.stringify(results, null, 2));
  }

  /**
   * sparql executes a SPARQL query or file against a world.
   */
  public async sparql(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["world", "query"],
      alias: { w: "world", q: "query", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds sparql [--slug <id>] --query <query_or_file_path>",
      );
      return;
    }

    const slug = (parsed.slug as string) || "_";
    const queryOrPath = parsed.query as string;
    if (!queryOrPath) {
      console.error(
        "Usage: worlds sparql [--slug <id>] --query <query_or_file_path>",
      );
      return;
    }

    let query = queryOrPath;
    try {
      query = await Deno.readTextFile(queryOrPath);
    } catch {
      // Not a file, use as query string
    }

    const results = await this.worlds.sparql({
      sources: [slug],
      query,
    });
    console.log(JSON.stringify(results, null, 2));
  }

  public async import(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["slug", "file", "content-type"],
      alias: { s: "slug", f: "file", c: "content-type", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds import --slug <id> --file <file_path> [--content-type <text/turtle|application/n-quads|...>]",
      );
      return;
    }
    const slug = (parsed.slug as string) || "_";
    const path = parsed.file as string;
    if (!path) {
      console.error(
        "Usage: worlds import --slug <id> --file <file_path> [--content-type <text/turtle|application/n-quads|...>]",
      );
      return;
    }
    const data = await Deno.readFile(path);
    await this.worlds.import({
      source: slug,
      data: data.buffer as ArrayBuffer,
      contentType: parsed["content-type"] as WorldsContentType,
    });
    console.log(`Imported data into world ${slug}`);
  }

  /**
   * export a world's knowledge graph to RDF data.
   */
  public async export(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["slug", "content-type"],
      alias: { s: "slug", c: "content-type", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds export --slug <id> [--content-type <text/turtle|application/n-quads|...>]",
      );
      return;
    }
    const slug = (parsed.slug as string) || "_";
    const buffer = await this.worlds.export({
      source: slug,
      contentType: parsed["content-type"] as WorldsContentType,
    });
    await Deno.stdout.write(new Uint8Array(buffer));
  }

  // TODO: List recent logs using the logs endpoint.

  /**
   * chat starts an interactive AI session with a world's knowledge graph.
   */
  public async chat(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help", "write"],
      string: ["world", "user-iri", "assistant-iri"],
      alias: {
        w: "world",
        u: "user-iri",
        a: "assistant-iri",
        h: "help",
      },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds chat --world <id> [--write] [--user-iri <iri>] [--assistant-iri <iri>]",
      );
      console.log("");
      console.log("Options:");
      console.log("  -w, --world        World ID to chat in (required)");
      console.log("  --write            Enable write operations");
      console.log("  -u, --user-iri      User IRI for provenance");
      console.log("  -a, --assistant-iri Assistant IRI for provenance");
      console.log("");
      console.log("Environment:");
      console.log(
        "  OPENROUTER_API_KEY  Your OpenRouter API key",
      );
      console.log(
        "  OPENROUTER_MODEL    OpenRouter model (default: google/gemini-2.0-flash-001)",
      );
      return;
    }

    if (!parsed.world) {
      console.error(
        "Usage: worlds chat --world <id> [--write] [--user-iri <iri>] [--assistant-iri <iri>]",
      );
      return;
    }

    const world = await this.worlds.get({ source: parsed.world });
    if (!world) {
      console.error(`World "${parsed.world}" not found.`);
      return;
    }

    // Resolve AI model.
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    const modelId = Deno.env.get("OPENROUTER_MODEL") ??
      "google/gemini-2.0-flash-001";

    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not set.");
      Deno.exit(1);
    }

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(modelId);

    // Set up tools.
    const tools = createTools({
      worlds: this.worlds,
      sources: [
        { slug: parsed.world, write: parsed.write ?? false },
      ],
    });

    // Set up conversation.
    const messages: ModelMessage[] = [];

    WorldsCli.logo();
    console.log(
      "%cWelcome to Worlds Chat.%c Type 'exit' to quit.",
      "color: #10b981; font-weight: bold",
      "color: #6b7280",
    );
    console.log(
      "%cWorld:%c %s   %cWrite:%c %s",
      "color: #6366f1; font-weight: bold",
      "color: #e5e7eb",
      parsed.world,
      "color: #6366f1; font-weight: bold",
      "color: #e5e7eb",
      parsed.write ? "enabled" : "disabled",
    );
    console.log("");

    // REPL loop.
    while (true) {
      const userInput = prompt(">");
      if (!userInput) {
        continue;
      }

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      messages.push({
        role: "user",
        content: [{ type: "text", text: userInput }],
      });

      const result = streamText({
        model,
        tools,
        system:
          "You are a helpful assistant that can query and manage a knowledge graph. " +
          "Use the provided tools to search, query, and update the knowledge base. " +
          `The available source ID is "${parsed.world}". Always use this exact ID when calling tools that require a source parameter. ` +
          (parsed["user-iri"]
            ? `The current user IRI is ${parsed["user-iri"]}. `
            : "") +
          (parsed["assistant-iri"]
            ? `Your active AI assistant IRI is ${parsed["assistant-iri"]}. `
            : "") +
          "When the user asks a question, use the tools to find the answer. " +
          "Be concise in your responses.",
        stopWhen: stepCountIs(100),
        messages,
      });

      // deno-lint-ignore no-explicit-any
      const toolCalls = new Map<string, any>();
      const startTime = Date.now();
      let stepCount = 0;

      console.log("\n%c✦ Assistant", "color: #f59e0b; font-weight: bold");

      const spinner = new Spinner({
        message: "Thinking...",
        color: "yellow",
      });
      spinner.start();

      try {
        for await (const part of result.fullStream) {
          switch (part.type) {
            case "text-delta": {
              spinner.stop();
              if (part.text) {
                await Deno.stdout.write(
                  new TextEncoder().encode(
                    `\x1b[38;2;245;158;11m${part.text}\x1b[0m`,
                  ),
                );
              }
              break;
            }

            case "tool-call": {
              spinner.stop();
              toolCalls.set(part.toolCallId, part);
              stepCount++;
              break;
            }

            case "tool-result": {
              spinner.stop();
              const call = toolCalls.get(part.toolCallId);
              if (!call) break;

              const partOutput = "output" in part
                ? part.output as unknown
                : part;
              const callInput = "input" in call ? call.input as unknown : {};

              // Format output for display.
              let outputStr = "";
              try {
                if (typeof partOutput === "string") {
                  outputStr = partOutput.length > 200
                    ? `${partOutput.substring(0, 200)}...`
                    : partOutput;
                } else if (
                  partOutput === null || partOutput === undefined
                ) {
                  outputStr = "null";
                } else {
                  const jsonStr = JSON.stringify(partOutput, null, 2);
                  outputStr = jsonStr.length > 200
                    ? `${jsonStr.substring(0, 200)}...`
                    : jsonStr;
                }
              } catch {
                outputStr = String(partOutput);
              }

              // Check if result looks like an error.
              const outputStrLower = typeof partOutput === "string"
                ? partOutput.toLowerCase()
                : "";
              const isError = partOutput instanceof Error ||
                outputStrLower.includes("error") ||
                outputStrLower.includes("failed");

              // Format call detail for display.
              let callDetail = "";
              switch (call.toolName) {
                case "worlds_sparql": {
                  const input = callInput as { sparql?: string };
                  const sparql = input.sparql?.trim() || "";
                  callDetail = `worlds_sparql(\n${sparql}\n)`;
                  break;
                }
                case "worlds_search": {
                  const input = callInput as { query?: string };
                  callDetail = `worlds_search("${input.query || ""}")`;
                  break;
                }
                default: {
                  const inputStr = JSON.stringify(callInput, null, 2);
                  callDetail = `${call.toolName}(\n${inputStr}\n)`;
                }
              }

              if (isError) {
                let errorStr = "";
                if (partOutput instanceof Error) {
                  errorStr = partOutput.message;
                } else if (
                  typeof partOutput === "object" && partOutput !== null
                ) {
                  const errorObj = partOutput as {
                    error?: string;
                    message?: string;
                  };
                  errorStr = errorObj.error || errorObj.message ||
                    JSON.stringify(partOutput);
                } else {
                  errorStr = outputStr;
                }
                console.log(
                  `\n%c⚙%c ${callDetail} => %c${errorStr}`,
                  "color: #64748b",
                  "color: #94a3b8",
                  "color: #ef4444; font-weight: bold",
                );
              } else {
                console.log(
                  `\n%c⚙%c ${callDetail} => %c${outputStr}`,
                  "color: #64748b",
                  "color: #94a3b8",
                  "color: #10b981",
                );
              }
              break;
            }

            default:
              break;
          }

          if (
            part.type === "tool-call" || part.type === "tool-result"
          ) {
            spinner.start();
          }
        }
      } catch (error) {
        spinner.stop();
        console.error(
          "\n%c[ERROR]%c Stream error: %c%s",
          "color: #ef4444; font-weight: bold",
          "color: #64748b",
          "color: #fca5a5",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }

      spinner.stop();

      const response = await result.response;
      const duration = Date.now() - startTime;

      console.log(
        `\n%c[DEBUG]%c Completed in %c${duration}ms%c with %c${stepCount}%c step(s)`,
        "color: #6366f1; font-weight: bold",
        "color: #64748b",
        "color: #10b981; font-weight: bold",
        "color: #64748b",
        "color: #10b981; font-weight: bold",
        "color: #64748b",
      );
      console.log("");

      messages.push(...response.messages as ModelMessage[]);
    }
  }
}
