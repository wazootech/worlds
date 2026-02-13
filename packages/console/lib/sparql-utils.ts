import type { ExecuteSparqlOutput } from "@wazoo/sdk";

/**
 * Formats SPARQL results as text for copying.
 * - SELECT queries: Returns CSV format (easier to paste into spreadsheets)
 * - ASK queries: Returns "TRUE" or "FALSE"
 * - UPDATE queries: Returns the message
 * - Other: Returns formatted JSON
 */
export function formatSparqlResultsForCopy(
  results: ExecuteSparqlOutput | { message: string } | null,
): string {
  if (!results) {
    return "";
  }

  // Handle Update/Message
  if ("message" in results) {
    return (results as { message: string }).message;
  }

  // Handle Boolean (ASK)
  if ("boolean" in results) {
    return results.boolean ? "TRUE" : "FALSE";
  }

  // Handle Select - check for different possible structures
  const hasHead = results && typeof results === "object" && "head" in results;
  const hasResults =
    results && typeof results === "object" && "results" in results;

  if (hasHead && hasResults) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyResults = results as any;
    const vars = anyResults.head?.vars || [];
    const bindings = anyResults.results?.bindings || [];

    if (vars.length > 0 && bindings.length > 0) {
      // Format as CSV
      const header = vars.map((v: string) => `?${v}`).join(",");
      const rows = bindings.map((binding: Record<string, { value: string }>) =>
        vars
          .map((v: string) => {
            const cell = binding[v];
            return cell ? `"${cell.value.replace(/"/g, '""')}"` : "";
          })
          .join(","),
      );
      return [header, ...rows].join("\n");
    }
  }

  // Fallback to JSON
  return JSON.stringify(results, null, 2);
}
