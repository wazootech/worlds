import type { Source } from "#/schemas/mod.ts";
import { errorResponseDataSchema } from "#/schemas/mod.ts";

/**
 * parseError parses an error response from the API.
 */
export async function parseError(response: Response): Promise<string> {
  let errorMessage = `${response.status} ${response.statusText}`;
  try {
    const WorldsContentType = response.headers.get("content-type");
    if (WorldsContentType?.includes("application/json")) {
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
 * parseSources validates and normalizes a list of sources.
 */
export function parseSources(sources: Array<string | Source>): Source[] {
  const seen = new Set<string>();
  return sources.map((source) => {
    const parsed: Source = typeof source === "string"
      ? { slug: source }
      : source;
    if (seen.has(parsed.slug)) {
      throw new Error(`Duplicate source: ${parsed.slug}`);
    }

    seen.add(parsed.slug);
    return parsed;
  });
}
