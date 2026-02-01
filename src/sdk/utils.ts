import { z } from "zod";

/**
 * PaginationParams represents validated pagination parameters.
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * paginationParamsSchema is the Zod schema for PaginationParams.
 */
export const paginationParamsSchema: z.ZodType<PaginationParams> = z.object({
  page: z.number().int().positive().max(10000).default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

/**
 * limitParamSchema validates limit query parameters.
 * Ensures limit is within reasonable bounds (max 100).
 */
export const limitParamSchema: z.ZodType<number> = z.number().int().positive()
  .max(100);

const errorSchema = z.object({
  error: z.object({
    message: z.string(),
  }),
}).transform((data) => data.error.message);

/**
 * parseError parses an error response from the API.
 */
export async function parseError(response: Response): Promise<string> {
  let errorMessage = `${response.status} ${response.statusText}`;
  try {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = await response.json();
      const result = errorSchema.safeParse(json);
      if (result.success) {
        errorMessage = result.data;
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
