import type { CreateToolsOptions, SourceOptions } from "./types.ts";

/**
 * normalizeSources normalizes sources array, returning an empty array if undefined or empty.
 * An empty array means "all worlds accessible" (no source restrictions).
 */
export function normalizeSources(
  sources?: SourceOptions[],
): SourceOptions[] {
  if (!sources || sources.length === 0) {
    return [];
  }

  return sources;
}

/**
 * validateSources validates that sources don't contain duplicate worldIds.
 * Throws an error if duplicates are found.
 */
export function validateSources(sources?: SourceOptions[]): void {
  const normalized = normalizeSources(sources);
  if (normalized.length === 0) {
    return;
  }

  const worldIdCounts = new Map<string, number>();
  for (const source of normalized) {
    const count = worldIdCounts.get(source.worldId) ?? 0;
    worldIdCounts.set(source.worldId, count + 1);
  }

  const duplicates: string[] = [];
  for (const [worldId, count] of worldIdCounts) {
    if (count > 1) {
      duplicates.push(worldId);
    }
  }

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate worldIds found in sources: ${duplicates.join(", ")}`,
    );
  }
}

/**
 * getDefaultSource finds the source marked as default.
 * Throws an error if more than one default source is found.
 * Throws an error if there's a single source with default: false.
 */
export function getDefaultSource(
  sources?: SourceOptions[],
): SourceOptions | undefined {
  const normalized = normalizeSources(sources);
  if (normalized.length === 0) {
    return;
  }

  if (normalized.length === 1) {
    const source = normalized[0];
    if (source.default === false) {
      throw new Error(
        "Single source must be marked as default (set default: true)",
      );
    }
    return source;
  }

  const defaultSources = normalized.filter((source) => source.default === true);
  if (defaultSources.length > 1) {
    const worldIds = defaultSources.map((source) => source.worldId).join(", ");
    throw new Error(
      `Multiple default sources found. Only one source can be marked as default. Found default sources with worldIds: ${worldIds}`,
    );
  }

  return defaultSources[0];
}

/**
 * getSourceByWorldId finds a source by its worldId.
 */
export function getSourceByWorldId(
  options: CreateToolsOptions,
  worldId: string,
): SourceOptions | undefined {
  const normalized = normalizeSources(options.sources);
  if (normalized.length === 0) {
    return undefined;
  }
  return normalized.find((source) => source.worldId === worldId);
}

// TODO: Consolidate isUpdateQuery implementations, removing tree-sitter implementation in favor of this string-manipulation solution.

/**
 * isUpdateQuery checks if a SPARQL query is an update operation.
 * This is a simple regex-based check for SDK-level tools.
 */
export function isUpdateQuery(query: string): boolean {
  // Normalize the query: remove comments and normalize whitespace
  const normalized = query
    .replace(/#[^\n]*/g, "") // Remove comments
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .toUpperCase();

  // Check for update keywords at the start (after optional prefixes)
  // Update operations: INSERT, DELETE, LOAD, CLEAR, DROP, CREATE, ADD, MOVE, COPY
  const updateKeywords = [
    "INSERT",
    "DELETE",
    "LOAD",
    "CLEAR",
    "DROP",
    "CREATE",
    "ADD",
    "MOVE",
    "COPY",
  ];

  // Check if query starts with any update keyword (accounting for PREFIX and BASE declarations)
  const prologueMatch = normalized.match(
    /^(?:(?:PREFIX\s+\w+:\s*<[^>]+>|BASE\s+<[^>]+>)\s*)*/,
  );
  const afterPrologue = normalized.slice(prologueMatch?.[0]?.length ?? 0)
    .trim();

  return updateKeywords.some((keyword) => afterPrologue.startsWith(keyword));
}
