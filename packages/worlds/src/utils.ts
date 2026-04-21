import { errorResponseDataSchema } from "./api/v1/shared.schema.ts";


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

/**
 * CursorParams represents the decoded cursor values.
 */
export interface CursorParams {
  created_at: number;
  id: string;
}

/**
 * encodeCursor encodes cursor params into a base64 string.
 */
export function encodeCursor(params: CursorParams): string {
  const str = `${params.created_at}:${params.id}`;
  return btoa(str);
}

/**
 * decodeCursor decodes a base64 cursor string into CursorParams.
 * Returns null if the cursor is invalid.
 */
export function decodeCursor(cursor: string): CursorParams | null {
  try {
    const str = atob(cursor);
    const parts = str.split(":");
    if (parts.length !== 2) return null;
    const created_at = parseInt(parts[0], 10);
    if (isNaN(created_at)) return null;
    return { created_at, id: parts[1] };
  } catch {
    return null;
  }
}
