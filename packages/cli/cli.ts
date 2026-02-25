import { parseArgs } from "@std/cli/parse-args";
import { Spinner } from "@std/cli/unstable-spinner";
import { render } from "cfonts";
import type { LanguageModel, ModelMessage } from "ai";
import { stepCountIs, streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createTools } from "@wazoo/worlds-ai-sdk";
import type { RdfFormat, WorldsSdk } from "@wazoo/worlds-sdk";

/**
 * WorldsCli is a command line application for the Worlds API.
 */
export class WorldsCli {
  public constructor(private readonly sdk: WorldsSdk) {}

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

    const world = await this.sdk.worlds.create({
      slug,
      label: parsed.label,
      description: parsed.description,
    });
    console.log(JSON.stringify(world, null, 2));
  }

  public async update(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      string: ["label", "description", "slug"],
      alias: { l: "label", d: "description", s: "slug", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds update <worldId> [--slug <slug>] [--label <label>] [--description <desc>]",
      );
      return;
    }
    const worldId = parsed._[0] as string;
    if (!worldId) {
      console.error(
        "Usage: worlds update <worldId> [--slug <slug>] [--label <label>] [--description <desc>]",
      );
      return;
    }
    await this.sdk.worlds.update(worldId, {
      slug: parsed.slug,
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
      WorldsCli.logo();
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
      string: ["page", "pageSize"],
      alias: { p: "page", s: "pageSize", h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds list [--page <n>] [--pageSize <n>]",
      );
      return;
    }
    const worlds = await this.sdk.worlds.list({
      page: parsed.page ? parseInt(parsed.page as string) : undefined,
      pageSize: parsed.pageSize
        ? parseInt(parsed.pageSize as string)
        : undefined,
    });
    console.log(JSON.stringify(worlds, null, 2));
  }

  public async get(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help"],
      alias: { h: "help" },
    });

    if (parsed.help) {
      WorldsCli.logo();
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
      WorldsCli.logo();
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
      WorldsCli.logo();
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
      WorldsCli.logo();
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
      WorldsCli.logo();
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

  // TODO: List recent logs using the logs endpoint.

  public async chat(args: string[]) {
    const parsed = parseArgs(args, {
      boolean: ["help", "write"],
      string: ["worldId", "userIri"],
      alias: {
        w: "worldId",
        u: "userIri",
        h: "help",
      },
    });

    if (parsed.help) {
      WorldsCli.logo();
      console.log(
        "Usage: worlds chat --worldId <id> [--write] [--userIri <iri>]",
      );
      console.log("");
      console.log("Options:");
      console.log("  -w, --worldId   World ID to chat in (required)");
      console.log("  --write         Enable write operations");
      console.log("  -u, --userIri   User IRI for provenance");
      console.log("");
      console.log("Environment:");
      console.log(
        "  GOOGLE_API_KEY      Use Google Gemini (gemini-2.5-flash)",
      );
      console.log(
        "  ANTHROPIC_API_KEY   Use Anthropic Claude (claude-haiku-4-5)",
      );
      return;
    }

    if (!parsed.worldId) {
      console.error(
        "Usage: worlds chat --worldId <id> [--write] [--userIri <iri>]",
      );
      return;
    }

    const world = await this.sdk.worlds.get(parsed.worldId);
    if (!world) {
      console.error(`World "${parsed.worldId}" not found.`);
      return;
    }

    // Resolve AI model.
    const googleKey = Deno.env.get("GOOGLE_API_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    let model: LanguageModel | undefined;
    if (googleKey) {
      const google = createGoogleGenerativeAI({ apiKey: googleKey });
      model = google("gemini-3-flash-preview");
    }
    if (anthropicKey) {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      model = anthropic("claude-haiku-4-5");
    }
    if (!model) {
      console.error(
        "Neither GOOGLE_API_KEY nor ANTHROPIC_API_KEY is set.",
      );
      Deno.exit(1);
    }

    // Set up tools.
    const tools = createTools({
      sdk: this.sdk,
      sources: [
        { id: parsed.worldId, write: parsed.write ?? false },
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
      parsed.worldId,
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
          `The available source ID is "${parsed.worldId}". Always use this exact ID when calling tools that require a source parameter. ` +
          (parsed.userIri
            ? `The current user IRI is ${parsed.userIri}. `
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
                case "executeSparql": {
                  const input = callInput as { sparql?: string };
                  const sparql = input.sparql?.trim() || "";
                  callDetail = `executeSparql(\n${sparql}\n)`;
                  break;
                }
                case "searchEntities": {
                  const input = callInput as { query?: string };
                  callDetail = `searchEntities("${input.query || ""}")`;
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
