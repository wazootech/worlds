import type { Tool } from "ai";
import { ulid } from "@std/ulid/ulid";
import type { World } from "#/sdk/worlds.ts";
import { createExecuteSparqlTool } from "./execute-sparql/tool.ts";
import { createSearchFactsTool } from "./search-facts/tool.ts";
import { createGenerateIriTool } from "./generate-iri/tool.ts";

/**
 * generateIri generates a random IRI using the ulid library
 * and a default prefix.
 */
export function generateIri(): string {
  return `https://wazoo.tech/.well-known/genid/${ulid()}`;
}

/**
 * CreateToolsOptions are the options for creating tools.
 */
export interface CreateToolsOptions {
  /**
   * world is the world for which tools are being created.
   */
  world: World;

  /**
   * generateIri is a function that generates an IRI for new entities.
   */
  generateIri?: () => string;
}

// TODO: Improve accuracy of ReturnType<typeof createTools>.

/**
 * createTools creates a set of tools for a world.
 */
export function createTools(options: CreateToolsOptions): {
  executeSparql: Tool;
  searchFacts: Tool;
  generateIri: Tool;
} {
  return {
    executeSparql: createExecuteSparqlTool(options.world),
    searchFacts: createSearchFactsTool(options.world),
    generateIri: createGenerateIriTool(options.generateIri ?? generateIri),
  };
}

/**
 * FormatPromptOptions are the options for formatting a prompt.
 */
export interface FormatPromptOptions {
  /**
   * world is the world for which the prompt is being formatted.
   */
  world: World;

  /**
   * content is the content of the prompt.
   */
  content: string;

  /**
   * date is the date of the prompt.
   */
  date?: Date;

  /**
   * userIri is the IRI of the user.
   */
  userIri?: string;

  /**
   * assistantIri is the IRI of the assistant.
   */
  assistantIri?: string;
}

/**
 * formatPrompt formats a prompt for a world.
 */
export function formatPrompt(options: FormatPromptOptions): string {
  const parts: string[] = [];

  // Giving the user an IRI helps the assistant reason about the user.
  if (options.userIri) {
    parts.push(
      `The user's IRI is <${options.userIri}>. When the prompt references the user (explicitly or implicitly through first-person pronouns such as "me", "I", "we", etc.), use this IRI.`,
    );
  }

  // Giving the assistant an IRI helps the assistant reason about itself.
  if (options.assistantIri) {
    parts.push(
      `The assistant's IRI is <${options.assistantIri}>. When the prompt references the assistant (explicitly or implicitly through second-person pronouns), use this IRI.`,
    );
  }

  // Giving the assistant a clock helps the assistant reason about time.
  if (options.date) {
    parts.push(
      `The time of writing is ${options.date}.`,
    );
  }

  // Append the content of the prompt at the end.
  parts.push(options.content);

  // Join all formatted parts with a newline.
  return parts.join("\n\n");
}
