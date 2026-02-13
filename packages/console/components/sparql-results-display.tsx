import type { ExecuteSparqlOutput, SparqlBinding } from "@wazoo/sdk";
import { Loader2Icon } from "lucide-react";

interface SparqlResultsDisplayProps {
  results: ExecuteSparqlOutput | { message: string } | null;
  loading?: boolean;
  compact?: boolean;
}

export function SparqlResultsDisplay({
  results,
  loading,
  compact = false,
}: SparqlResultsDisplayProps) {
  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-${
          compact ? "4" : "8"
        } text-stone-500`}
      >
        <Loader2Icon
          className={`${
            compact ? "w-5 h-5" : "w-8 h-8"
          } mb-2 animate-spin text-amber-600`}
        />
        <p className="text-sm font-medium text-stone-600 dark:text-stone-400 animate-pulse">
          Executing query...
        </p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="h-full flex items-center justify-center text-stone-500 text-sm">
        Execute a query to see results
      </div>
    );
  }

  // Handle Update/Message
  if ("message" in results) {
    const message = (results as { message: string }).message;
    return (
      <div
        className={`${
          compact ? "p-2" : "p-4"
        } text-stone-900 dark:text-stone-100`}
      >
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-green-800 dark:text-green-200 font-medium text-sm">
            {message}
          </p>
        </div>
      </div>
    );
  }

  // Handle Boolean (ASK)
  if ("boolean" in results) {
    return (
      <div
        className={`${compact ? "p-2" : "p-4"} flex items-center ${
          compact ? "justify-start" : "justify-center h-full"
        }`}
      >
        <div className={compact ? "flex items-center gap-2" : "text-center"}>
          <span
            className={`${compact ? "text-lg" : "text-4xl"} font-bold ${
              results.boolean
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {results.boolean ? "TRUE" : "FALSE"}
          </span>
          {!compact && (
            <p className="text-stone-500 mt-2 text-sm uppercase tracking-wider font-semibold">
              Boolean Result
            </p>
          )}
        </div>
      </div>
    );
  }

  // Handle Select - check for different possible structures
  // Some SPARQL results have 'head' and 'results', some might be slightly different
  const hasHead = results && typeof results === "object" && "head" in results;
  const hasResults =
    results && typeof results === "object" && "results" in results;

  if (hasHead && hasResults) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyResults = results as any;
    const vars = anyResults.head?.vars || [];
    const bindings = anyResults.results?.bindings || [];

    // If we have either variables or bindings, it's a SELECT result
    if (vars.length > 0 || bindings.length > 0) {
      if (bindings.length === 0) {
        return (
          <div
            className={`${
              compact ? "p-2" : "p-4"
            } text-stone-500 italic text-sm`}
          >
            No results found.
          </div>
        );
      }

      return (
        <div className="overflow-auto h-full">
          <table
            className={`w-full text-left font-mono ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            <thead className="bg-stone-100 dark:bg-stone-800 sticky top-0 z-10">
              <tr>
                {vars.map((v: string) => (
                  <th
                    key={v}
                    className={`${
                      compact ? "px-3 py-2" : "px-4 py-2"
                    } border-b border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold whitespace-nowrap`}
                  >
                    ?{v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {bindings.map((binding: SparqlBinding, i: number) => (
                <tr
                  key={i}
                  className="hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors"
                >
                  {vars.map((v: string) => {
                    const cell = binding[v];
                    return (
                      <td
                        key={v}
                        className={`${
                          compact ? "px-3 py-2" : "px-4 py-2"
                        } text-stone-900 dark:text-stone-100 whitespace-nowrap max-w-xs truncate`}
                        title={cell?.value || ""}
                      >
                        {cell ? (
                          cell.type === "uri" ? (
                            <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                              {cell.value}
                            </span>
                          ) : (
                            <span>{cell.value}</span>
                          )
                        ) : (
                          <span className="text-stone-400 opacity-50">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  // Fallback to formatted JSON if it's not a table
  return (
    <div className={compact ? "p-0" : "p-2"}>
      <pre className="overflow-auto rounded-md bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 text-xs font-mono text-stone-900 dark:text-stone-100">
        <code>{JSON.stringify(results, null, 2)}</code>
      </pre>
    </div>
  );
}
