import type { ErrorResponseData } from "./api/v1/types.gen.ts";

/**
 * isErrorResponseData check if a value is an ErrorResponseData.
 */
export function isErrorResponseData(
  value: unknown,
): value is ErrorResponseData {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as Record<string, unknown>).error === "object" &&
    (value as { error: { message?: unknown } }).error.message !== undefined
  );
}

/**
 * parseError extracts a message from an ErrorResponseData or unknown error.
 */
export function parseError(error: unknown): string {
  if (isErrorResponseData(error)) {
    return error.error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * decodeCursor converts a base64 string to a generic data object.
 */
// deno-lint-ignore no-explicit-any
export function decodeCursor(cursor?: string): any {
  if (!cursor) return undefined;
  try {
    return JSON.parse(atob(cursor));
  } catch {
    return undefined;
  }
}

/**
 * encodeCursor converts a generic data object to a base64 string.
 */
export function encodeCursor(data: unknown): string {
  return btoa(JSON.stringify(data));
}

/**
 * isSparqlUpdate checks if a SPARQL query is an update operation.
 */
export function isSparqlUpdate(query: string): boolean {
  const normalized = query.trim().toUpperCase();
  const updateKeywords = [
    "INSERT",
    "DELETE",
    "LOAD",
    "CLEAR",
    "CREATE",
    "DROP",
    "COPY",
    "MOVE",
    "ADD",
  ];

  // Remove prologue (PREFIX/BASE) for check
  const body = normalized.replace(/^(PREFIX|BASE).*/gim, "").trim();

  return updateKeywords.some((kw) => body.startsWith(kw));
}

/**
 * escapeSparqlLiteral escapes a string for use in a SPARQL literal.
 */
export function escapeSparqlLiteral(value: string): string {
  return value
    .replace(/\\/g, "\\\\") // \ -> \\
    .replace(/"/g, '\\"') // " -> \"
    .replace(/\n/g, "\\n") // newline
    .replace(/\r/g, "\\r") // carriage return
    .replace(/\t/g, "\\t"); // tab
}

/**
 * escapeSparqlUri escapes a string for use in a SPARQL URI.
 */
export function escapeSparqlUri(value: string): string {
  return value
    .replace(/\\/g, "\\\\") // \ -> \\
    .replace(/>/g, "\\>"); // > -> \>
}
