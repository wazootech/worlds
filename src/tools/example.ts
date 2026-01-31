import { render } from "cfonts";
import { Spinner } from "@std/cli/unstable-spinner";
import type { LanguageModel, ModelMessage } from "ai";
import { stepCountIs, streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@libsql/client";
import { createServer } from "#/server/server.ts";
import { createTestTenant } from "#/server/testing.ts";
import type { WorldsOptions } from "#/sdk/types.ts";
import { InternalWorldsSdk } from "#/sdk/internal/sdk.ts";
import { UniversalSentenceEncoderEmbeddings } from "#/server/embeddings/use.ts";
import { initializeDatabase } from "#/server/db/init.ts";
import { tenantsFind } from "#/server/db/queries/tenants.sql.ts";
import type { AppContext } from "#/server/app-context.ts";
import { createTools } from "./tools.ts";
import { formatPrompt } from "./format.ts";
import systemPrompt from "./prompt.md" with { type: "text" };

/**
 * createExampleContext creates a custom app context for the example CLI.
 */
async function createExampleContext(): Promise<AppContext> {
  const apiKey = "admin-api-key";

  const libsqlClient = createClient({ url: ":memory:" });
  const embeddings = new UniversalSentenceEncoderEmbeddings();

  // Initialize database tables
  await initializeDatabase(libsqlClient);

  // Preload embeddings model to avoid first-request delay
  console.log(
    "%c[INFO]%c Preloading embeddings model...",
    "color: #6366f1; font-weight: bold",
    "color: #64748b",
  );
  const loadStart = performance.now();
  await embeddings.load();
  const loadTime = performance.now() - loadStart;
  const loadTimeSeconds = (loadTime / 1000).toFixed(2);
  console.log(
    "%c[INFO]%c Embeddings model loaded in %c%s%s",
    "color: #6366f1; font-weight: bold",
    "color: #64748b",
    "color: #10b981; font-weight: bold",
    loadTimeSeconds,
    "s",
  );

  return {
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
    baseUrl: "http://localhost",
    apiKey: appContext.admin!.apiKey!,
    fetch: (url, init) => server.fetch(new Request(url, init)),
  };

  const sdk = new InternalWorldsSdk(worldsOptions);

  // Create test tenant with explicit free plan.
  const testTenant = await createTestTenant(appContext.libsqlClient, {
    plan: "free",
  });

  // Verify tenant plan.
  const tenantResult = await appContext.libsqlClient.execute({
    sql: tenantsFind,
    args: [testTenant.id],
  });
  const tenant = tenantResult.rows[0];
  if (!tenant || tenant.plan !== "free") {
    throw new Error(
      `Tenant created with plan "${tenant?.plan}" instead of "free"`,
    );
  }

  console.log(
    "%c[DEBUG]%c Test tenant created with plan: %c%s",
    "color: #6366f1; font-weight: bold",
    "color: #64748b",
    "color: #10b981; font-weight: bold",
    tenant.plan,
  );

  const worldRecord = await sdk.worlds.create({
    label: "Test World",
    description: "Test World",
    isPublic: false,
  }, { tenantId: testTenant.id });

  // Shared configuration for tools and prompts.
  const sharedOptions = {
    write: true,
    userIri: "https://etok.me/",
    sources: [
      { worldId: worldRecord.id },
    ],
  };

  // Set up tools.
  const tools = createTools({
    ...worldsOptions,
    ...sharedOptions,
  });

  // Set up AI agent.
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

    const formattedPrompt = formatPrompt({
      content: userInput,
      date: new Date(),
      ...sharedOptions,
    });

    // Debug: Log user input and formatted prompt.
    console.log(
      "\n%c[DEBUG]%c User input: %c%s",
      "color: #6366f1; font-weight: bold",
      "color: #64748b",
      "color: #e5e7eb",
      userInput,
    );
    if (Deno.env.get("DEBUG_PROMPT") === "true") {
      console.log(
        "%c[DEBUG]%c Formatted prompt:\n%c%s",
        "color: #6366f1; font-weight: bold",
        "color: #64748b",
        "color: #9ca3af; font-family: monospace; font-size: 0.9em",
        formattedPrompt,
      );
    }

    messages.push({
      role: "user",
      content: [{
        type: "text",
        text: formattedPrompt,
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
    const startTime = Date.now();
    let stepCount = 0;

    console.log("\n%c✦ Assistant", "color: #f59e0b; font-weight: bold");

    const spinner = new Spinner({ message: "Thinking...", color: "yellow" });
    spinner.start();

    try {
      for await (const part of result.fullStream) {
        // Debug: Log all stream events to help diagnose hangs
        if (Deno.env.get("DEBUG_STREAM") === "true") {
          console.log(
            `%c[DEBUG STREAM]%c Event type: %c${part.type}`,
            "color: #8b5cf6; font-weight: bold",
            "color: #64748b",
            "color: #cbd5e1",
          );
        }

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

            const partOutput = "output" in part ? part.output as unknown : part;
            const callInput = "input" in call ? call.input as unknown : {};

            // Format output for display
            let outputStr = "";
            try {
              if (typeof partOutput === "string") {
                outputStr = partOutput.length > 200
                  ? `${partOutput.substring(0, 200)}...`
                  : partOutput;
              } else if (partOutput === null || partOutput === undefined) {
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

            // Check if this is an error result
            const outputStrLower = typeof partOutput === "string"
              ? partOutput.toLowerCase()
              : "";
            const looksLikeError = outputStrLower.includes("error") ||
              outputStrLower.includes("failed") ||
              outputStrLower.includes("limit") ||
              outputStrLower.includes("exceeded") ||
              outputStrLower.includes("413") ||
              outputStrLower.includes("403") ||
              outputStrLower.includes("400");

            const isError = partOutput instanceof Error ||
              looksLikeError ||
              (typeof partOutput === "object" && partOutput !== null && (
                "error" in partOutput ||
                "message" in partOutput ||
                (typeof partOutput === "object" && "toString" in partOutput &&
                  partOutput.toString().includes("Error"))
              ));

            // Format call detail for display
            let callDetail = "";
            switch (call.toolName) {
              case "generateIri": {
                const input = callInput as { entityText?: string };
                callDetail = `generateIri(${
                  input.entityText ? `"${input.entityText}"` : ""
                })`;
                break;
              }
              case "executeSparql": {
                const input = callInput as { sparql?: string };
                const sparql = input.sparql?.trim() || "";
                callDetail = `executeSparql(\n${sparql}\n)`;
                break;
              }
              case "searchFacts": {
                const input = callInput as { query?: string };
                callDetail = `searchFacts("${input.query || ""}")`;
                break;
              }
              default: {
                const inputStr = JSON.stringify(callInput, null, 2);
                callDetail = `${call.toolName}(\n${inputStr}\n)`;
              }
            }

            // Log formatted tool call and result
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

              // For size limit errors, show helpful note
              if (
                errorStr.includes("size limit") ||
                errorStr.includes("413")
              ) {
                console.log(
                  `  %cNote:%c Free plan allows up to 10MB per world.`,
                  "color: #f59e0b; font-weight: bold",
                  "color: #fbbf24",
                );
              }
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

          default: {
            // Handle any unhandled stream event types
            if (Deno.env.get("DEBUG_STREAM") === "true") {
              const partType = "type" in part ? String(part.type) : "unknown";
              console.log(
                `%c[DEBUG STREAM]%c Unhandled event type: %c${partType}%c - %c${
                  JSON.stringify(part).substring(0, 200)
                }`,
                "color: #f59e0b; font-weight: bold",
                "color: #64748b",
                "color: #fbbf24",
                "color: #64748b",
                "color: #9ca3af",
              );
            }
            break;
          }
        }
        if (part.type === "tool-call" || part.type === "tool-result") {
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
      if (error instanceof Error && error.stack) {
        console.error(
          "%c[ERROR]%c Stack trace:\n%c%s",
          "color: #ef4444; font-weight: bold",
          "color: #64748b",
          "color: #9ca3af; font-family: monospace; font-size: 0.9em",
          error.stack,
        );
      }
      throw error;
    }

    spinner.stop();

    const response = await result.response;
    const duration = Date.now() - startTime;

    // Debug: Log completion stats.
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
