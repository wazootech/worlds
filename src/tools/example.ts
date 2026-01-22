import { render } from "cfonts";
import { Spinner } from "@std/cli/unstable-spinner";
import type { LanguageModel, ModelMessage } from "ai";
import { stepCountIs, streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@libsql/client";
import { createServer } from "#/server/server.ts";
import { createTestAccount } from "#/server/testing.ts";
import type { WorldsOptions } from "#/sdk/types.ts";
import { InternalWorldsSdk } from "#/sdk/internal/sdk.ts";
import { UniversalSentenceEncoderEmbeddings } from "#/server/embeddings/use.ts";
import { createWorldsKvdex } from "#/server/db/kvdex.ts";
import type { AppContext } from "#/server/app-context.ts";
import { createTools, formatPrompt } from "./tools.ts";
import systemPrompt from "./prompt.md" with { type: "text" };

/**
 * createExampleContext creates a custom app context for the example CLI.
 */
async function createExampleContext(): Promise<AppContext> {
  const kv = await Deno.openKv(":memory:");
  const db = createWorldsKvdex(kv);
  const apiKey = "admin-api-key";

  const libsqlClient = createClient({ url: ":memory:" });
  const embeddings = new UniversalSentenceEncoderEmbeddings();
  return {
    db,
    kv,
    libsqlClient,
    embeddings,
    admin: { apiKey },
  };
}

if (import.meta.main) {
  // Set up in-memory world.
  const appContext = await createExampleContext();
  const server = await createServer(appContext);
  const worldsOptions: WorldsOptions = {
    baseUrl: "http://localhost/v1",
    apiKey: appContext.admin!.apiKey!,
    fetch: (url, init) => server.fetch(new Request(url, init)),
  };

  const sdk = new InternalWorldsSdk(worldsOptions);

  const testAccount = await createTestAccount(appContext.db);
  const worldRecord = await sdk.worlds.create({
    label: "Test World",
    description: "Test World",
    isPublic: false,
  }, { accountId: testAccount.id });

  // Set up tools.
  const tools = createTools({
    ...worldsOptions,
    worldId: worldRecord.id,
  });

  // Set up AI.
  const messages: ModelMessage[] = [];

  const googleKey = Deno.env.get("GOOGLE_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  let model: LanguageModel | undefined;
  if (googleKey) {
    const google = createGoogleGenerativeAI({
      apiKey: googleKey,
    });
    model = google("gemini-2.5-flash");
  }

  if (anthropicKey) {
    const anthropic = createAnthropic({
      apiKey: anthropicKey,
    });
    model = anthropic("claude-haiku-4-5");
  }

  if (!model) {
    throw new Error(
      "Neither GOOGLE_API_KEY nor ANTHROPIC_API_KEY is set.",
    );
  }

  const renderResult = render("Worlds CLI", {
    font: "block",
    align: "left",
    colors: ["#d97706"],
    background: "transparent",
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
    maxLength: "0",
    gradient: ["#d97706", "#f59e0b"],
    independentGradient: true,
    transitionGradient: true,
    env: "node",
  });
  const banner = renderResult ? renderResult.string : "Worlds CLI";
  console.log(banner);
  console.log(
    "%cWelcome to Worlds CLI.%c Type 'exit' to quit.",
    "color: #10b981; font-weight: bold",
    "color: #6b7280",
  );

  // Run REPL.
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
      content: [{
        type: "text",
        text: formatPrompt({
          content: userInput,
          userIri: "https://etok.me/",
          date: new Date(),
        }),
      }],
    });

    // Stream response.
    const result = streamText({
      model,
      tools,
      system: systemPrompt,
      stopWhen: stepCountIs(100),
      messages,
    });

    // Track state for logging tool calls.
    // deno-lint-ignore no-explicit-any
    const toolCalls = new Map<string, any>();

    console.log("\n%c✦ Assistant", "color: #10b981; font-weight: bold");

    const spinner = new Spinner({ message: "Thinking...", color: "yellow" });
    spinner.start();

    for await (const part of result.fullStream) {
      switch (part.type) {
        case "text-delta": {
          spinner.stop();
          if (part.text) {
            await Deno.stdout.write(
              new TextEncoder().encode(
                `\x1b[38;2;16;185;129m${part.text}\x1b[0m`,
              ),
            );
          }
          break;
        }

        case "tool-call": {
          spinner.stop();
          toolCalls.set(part.toolCallId, part);
          break;
        }

        case "tool-result": {
          spinner.stop();
          const call = toolCalls.get(part.toolCallId);
          if (!call) break;

          const styles = [
            "color: #64748b", // gear icon
            "color: #94a3b8", // name
            "color: #cbd5e1", // input
            "color: #94a3b8", // name end
            "color: #d97706", // arrow
            "color: #d97706", // output
          ];

          let callDetail = "";
          switch (call.toolName) {
            case "generateIri": {
              callDetail = `generateIri(%c${call.input.entityText}%c)`;
              break;
            }
            case "executeSparql": {
              callDetail = `executeSparql(%c${call.input.sparql.trim()}%c)`;
              break;
            }
            case "searchFacts": {
              callDetail = `searchFacts(%c${call.input.query}%c)`;
              break;
            }
            default: {
              callDetail = `${call.toolName}(%c${
                JSON.stringify(call.input)
              }%c)`;
            }
          }

          console.log(
            `\n%c⚙ %c${callDetail}%c => %c${JSON.stringify(part.output)}`,
            ...styles,
          );
          break;
        }
      }
      if (part.type === "tool-call" || part.type === "tool-result") {
        spinner.start();
      }
    }

    spinner.stop();
    console.log("");

    const response = await result.response;
    messages.push(...response.messages as ModelMessage[]);
  }
}
