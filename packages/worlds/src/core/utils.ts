import { DEFAULT_WORLD } from "#/core/ontology.ts";
import type { WorldSource } from "#/schemas/mod.ts";
import { errorResponseDataSchema } from "#/schemas/mod.ts";

/**
 * parseError parses an error response from the API.
 */
export async function parseError(response: Response): Promise<string> {
  let errorMessage = `${response.status} ${response.statusText}`;
  try {
    const contentTypeHeader = response.headers.get("content-type");
    if (contentTypeHeader?.includes("application/json")) {
      const json = await response.json();
      const result = errorResponseDataSchema.safeParse(json);
      if (result.success) {
        errorMessage = result.data.error.message;
      }
    } else {
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    }
  } catch {
    // Ignore parsing errors and return the default status text
  }
  return errorMessage;
}

/**
 * isSparqlUpdate checks if a SPARQL query is an update operation.
 */
export function isSparqlUpdate(query: string): boolean {
  // Normalize the query: remove comments and normalize whitespace
  const normalized = query
    .replace(/(^|\s)#[^\n]*/g, "$1") // Only remove comments that start after whitespace or at start of line
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .toUpperCase();

  // Check for update keywords at the start (after optional prefixes)
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

/**
 * parseSourceName parses a source name into a namespace and world.
 * The name format is optional: "<namespace>/<world>" or just "<world>".
 */
export function parseSourceName(name: string): {
  namespace: string | null;
  world: string | null;
} {
  const trimmed = name.trim();
  if (trimmed === "") {
    return { namespace: null, world: DEFAULT_WORLD };
  }

  const parts = trimmed.split("/");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { namespace: parts[0], world: parts[1] };
  }

  return { namespace: null, world: trimmed };
}

/**
 * resolveSource resolves a WorldSource into world and namespace components.
 */
export function resolveSource(
  source: WorldSource,
  defaultNamespace?: string,
): {
  world: string | null;
  namespace: string | null;
} {
  let resolved: { world: string | null; namespace?: string | null };
  if (typeof source === "string") {
    resolved = parseSourceName(source);
  } else if (
    typeof source === "object" && source !== null && "name" in source
  ) {
    resolved = parseSourceName(source.name);
  } else if (typeof source === "object" && source !== null) {
    const sourceObject = source as {
      world?: string | null;
      namespace?: string | null;
    };
    const rawWorld = sourceObject.world;
    resolved = {
      world: rawWorld !== undefined && rawWorld !== "" ? rawWorld : DEFAULT_WORLD,
      namespace: sourceObject.namespace,
    };
  } else {
    resolved = { world: DEFAULT_WORLD };
  }

  const world = (resolved.world === "" || resolved.world === undefined)
    ? DEFAULT_WORLD
    : resolved.world;

  return {
    world,
    namespace: (resolved.namespace ?? defaultNamespace) ?? null,
  };
}

/**
 * parseSources validates and normalizes a list of sources.
 */
export function parseSources(
  sources: WorldSource[],
  defaultNamespace?: string,
): Array<{
  world: string | null;
  namespace: string | null;
}> {
  return sources.map((s) => resolveSource(s, defaultNamespace));
}

/**
 * escapeSparqlLiteral escapes a string for use as a SPARQL literal.
 */
export function escapeSparqlLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * escapeSparqlUri escapes a string for use as a SPARQL URI.
 */
export function escapeSparqlUri(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/</g, "\\<")
    .replace(/>/g, "\\>");
}
