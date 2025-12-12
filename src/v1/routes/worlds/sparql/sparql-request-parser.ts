/**
 * ParserResult represents the parsed SPARQL request body.
 */
export interface ParserResult {
  query?: string;
  update?: string;
}

/**
 * parseSparqlRequest parses the request body based on Content-Type.
 * Supports:
 * - application/sparql-query
 * - application/sparql-update
 * - application/x-www-form-urlencoded
 */
export async function parseSparqlRequest(
  request: Request,
): Promise<ParserResult> {
  const contentType = request.headers.get("Content-Type");

  if (contentType === "application/sparql-query") {
    return { query: await request.text() };
  } else if (contentType === "application/sparql-update") {
    return { update: await request.text() };
  } else if (contentType === "application/x-www-form-urlencoded") {
    const formData = await request.formData();
    const q = formData.get("query");
    const u = formData.get("update");
    return {
      query: typeof q === "string" ? q : undefined,
      update: typeof u === "string" ? u : undefined,
    };
  }

  throw new Error("Unsupported Content-Type");
}
