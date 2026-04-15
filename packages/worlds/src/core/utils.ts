import { toResolvedSource } from "#/core/sources.ts";
import type { WorldSource } from "#/schemas/mod.ts";
import { errorResponseDataSchema } from "#/schemas/mod.ts";

/**
 * @deprecated Use toResolvedSource from #/core/sources.ts instead.
 */
export function resolveSource(
  source: WorldSource,
  contextNamespace?: string,
): {
  world: string | null;
  namespace: string | null;
} {
  const resolved = toResolvedSource(source, { namespace: contextNamespace });
  return {
    world: resolved.world,
    namespace: resolved.namespace,
  };
}

/**
 * @deprecated Use toResolvedSource from #/core/sources.ts instead.
 */
export function parseSources(
  sources: WorldSource[],
  contextNamespace?: string,
): Array<{
  world: string | null;
  namespace: string | null;
}> {
  return sources.map((s) => resolveSource(s, contextNamespace));
}

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
  const normalized = query
    .replace(/(^|\s)#[^\n]*/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

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

  const prologueMatch = normalized.match(
    /^(?:(?:PREFIX\s+\w+:\s*<[^>]+>|BASE\s+<[^>]+>)\s*)*/,
  );
  const afterPrologue = normalized.slice(prologueMatch?.[0]?.length ?? 0)
    .trim();

  return updateKeywords.some((keyword) => afterPrologue.startsWith(keyword));
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
