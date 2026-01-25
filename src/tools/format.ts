import type { CreateToolsOptions, SourceOptions } from "./types.ts";
import { getDefaultSource } from "./utils.ts";

/**
 * formatWorldIdList formats a list of world IDs into a human-readable string.
 * Examples: "world1", "world1 and world2", "world1, world2, and world3"
 */
export function formatWorldIdList(worldIds: string[]): string {
  if (worldIds.length === 0) {
    return "none";
  }

  if (worldIds.length === 1) {
    return worldIds[0];
  }

  if (worldIds.length === 2) {
    return `${worldIds[0]} and ${worldIds[1]}`;
  }

  const last = worldIds[worldIds.length - 1];
  const rest = worldIds.slice(0, -1).join(", ");
  return `${rest}, and ${last}`;
}

/**
 * formatDefaultSourceInfo generates guidance text about the default source.
 */
export function formatDefaultSourceInfo(
  options: CreateToolsOptions,
): string {
  const defaultSource = getDefaultSource(options.sources);
  if (!defaultSource) {
    return "";
  }

  const writeText = options.write
    ? " or you need to insert/update/delete data into an empty world"
    : "";
  return `The default source is ${defaultSource.worldId}. When context is ambiguous${writeText}, omit the worldId parameter to use the default source.`;
}

/**
 * formatAvailableWorldsInfo lists available worlds with their properties.
 */
export function formatAvailableWorldsInfo(
  options: CreateToolsOptions,
): string {
  const sources = options.sources;
  if (!sources || sources.length === 0) {
    return "No worlds are configured.";
  }

  if (sources.length === 1) {
    const source = sources[0];
    return `Available world: ${source.worldId}${
      source.default ? " (default)" : ""
    }`;
  }

  const worldIds = sources.map((s) => {
    let label = s.worldId;
    if (s.default) {
      label += " (default)";
    }

    return label;
  });

  return `Available worlds: ${formatWorldIdList(worldIds)}`;
}

/**
 * formatWorldIdParameterHelp generates context-aware help for the worldId parameter.
 */
export function formatWorldIdParameterHelp(
  options: CreateToolsOptions,
): string {
  const sources = options.sources;
  const defaultSource = getDefaultSource(sources);
  if (!sources || sources.length === 0) {
    return "No worlds are configured. You must provide a worldId.";
  }

  if (defaultSource) {
    return `The worldId parameter is optional. If omitted, the query${
      options.write ? " or update" : ""
    } will use ${defaultSource.worldId} (the default source).`;
  }

  return "The worldId parameter is required. No default source is configured.";
}

/**
 * formatExecuteSparqlDescription generates the full description for executeSparql tool.
 */
export function formatExecuteSparqlDescription(
  options: CreateToolsOptions,
): string {
  const parts: string[] = [];
  const canWrite = options.write;

  const introText = canWrite
    ? "Execute SPARQL queries and updates against a specific world knowledge base. This tool provides full access to RDF data: you can read existing facts (SELECT, ASK, CONSTRUCT, DESCRIBE) and write/modify data (INSERT, DELETE, UPDATE, etc.)."
    : "Execute SPARQL queries against a specific world knowledge base. This tool provides read-only access to RDF data for exploring existing facts and schema (SELECT, ASK, CONSTRUCT, DESCRIBE).";

  parts.push(introText);

  const capabilities: string[] = [
    "Query data: SELECT, ASK, CONSTRUCT, DESCRIBE to explore existing facts and schema",
  ];

  if (canWrite) {
    capabilities.push(
      "Insert facts: INSERT DATA, INSERT {} to add new information",
      "Delete facts: DELETE DATA, DELETE {} to remove obsolete information",
      "Update data: Combine INSERT and DELETE for modifications",
    );
  }

  const supportedOps = canWrite
    ? "SELECT, ASK, CONSTRUCT, DESCRIBE, INSERT, DELETE, LOAD, CLEAR"
    : "SELECT, ASK, CONSTRUCT, DESCRIBE";

  parts.push(
    `Capabilities:\n- ${
      capabilities.join("\n- ")
    }\n- Supports: ${supportedOps}`,
  );

  const worldIdHelp = formatWorldIdParameterHelp(options);
  if (worldIdHelp) {
    parts.push(worldIdHelp);
  }

  parts.push(
    "If you don't know which worldId contains the data you need, first use searchFacts to find relevant facts. The search results include 'worldId' fields that identify which worlds contain matching data—use those worldIds here to execute your SPARQL operations.",
  );

  return parts.join("\n\n");
}

/**
 * formatSearchFactsDescription generates the full description for searchFacts tool.
 */
export function formatSearchFactsDescription(
  options: CreateToolsOptions,
): string {
  const parts: string[] = [];

  parts.push(
    "Search for facts across knowledge bases using full-text and semantic vector search. This tool is ideal for discovering entities, relationships, and information when you don't know exact IRIs or want to explore topics broadly.",
  );

  const availableWorlds = formatAvailableWorldsInfo(options);
  if (availableWorlds) {
    parts.push(availableWorlds);
  }

  parts.push(
    "Each result includes the fact (subject, predicate, object), a relevance score, and a 'worldId' field identifying which world contains that fact.",
  );

  parts.push(
    "Use the worldId values from search results to determine which specific world to query with executeSparql when you need to perform targeted SPARQL queries or updates.",
  );

  return parts.join("\n\n");
}

/**
 * formatGenerateIriDescription generates the full description for generateIri tool.
 */
export function formatGenerateIriDescription(
  options: CreateToolsOptions,
): string {
  const parts: string[] = [];
  parts.push(
    "Generate a unique IRI for a new entity. Use this when you need to insert a new node into the graph.",
  );

  if (options.write) {
    parts.push(
      "After generating an IRI, use executeSparql to insert the new entity into the knowledge base with an INSERT DATA or INSERT query.",
    );
  }

  return parts.join("\n\n");
}

/**
 * FormatPromptOptions are the options for formatting a prompt.
 */
export interface FormatPromptOptions {
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

  /**
   * sources are the sources to include in the prompt.
   */
  sources?: SourceOptions[];

  /**
   * write is a flag indicating whether write operations are allowed.
   */
  write?: boolean;
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

  // Include information about available sources (worlds).
  if (options.sources && options.sources.length > 0) {
    const defaultSource = getDefaultSource(options.sources);
    const sourceDescriptions = options.sources.map((source) => {
      const parts: string[] = [];
      parts.push(`- World ID: ${source.worldId}`);
      if (source.default) {
        parts.push("  (default)");
      }

      return parts.join(" ");
    });

    const sourceInfo = [
      "Available knowledge base sources (worlds):",
      ...sourceDescriptions,
    ];

    if (defaultSource) {
      const writeText = options.write
        ? " or you need to insert/update/delete data into an empty world"
        : "";
      sourceInfo.push(
        "",
        `When the context is ambiguous${writeText}, use the default world (${defaultSource.worldId}) by omitting the worldId parameter in executeSparql.`,
      );
    }

    parts.push(sourceInfo.join("\n"));
  }

  // Append the content of the prompt at the end.
  parts.push(options.content);

  // Join all formatted parts with a newline.
  return parts.join("\n\n");
}
