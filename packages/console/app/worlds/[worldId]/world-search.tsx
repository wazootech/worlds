"use client";

import { useState } from "react";
import { useQueryState } from "nuqs";
import type { TripleSearchResult } from "@wazoo/sdk";

interface WorldSearchProps {
  worldId: string;
  userId: string;
}

export function WorldSearch({ worldId, userId }: WorldSearchProps) {
  const [query, setQuery] = useQueryState("q", { defaultValue: "" });
  const [results, setResults] = useState<TripleSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResultsCopied, setIsResultsCopied] = useState(false);

  const executeSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      setResults(null);

      const response = await fetch(
        `/api/worlds/${worldId}/search?account=${userId}`,
        {
          method: "POST",
          body: query,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const data = (await response.json()) as TripleSearchResult[];
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute search");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setIsResultsCopied(true);
    setTimeout(() => setIsResultsCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden flex flex-col p-4">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={query || ""}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading && query?.trim()) {
                executeSearch();
              }
            }}
            placeholder="Search for something..."
            className="flex-1 px-4 py-3 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
          />
          <button
            onClick={executeSearch}
            disabled={loading || !query?.trim()}
            className="px-6 py-3 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium whitespace-nowrap"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Results/Error Display */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden flex flex-col min-h-[300px]">
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-white">
              {error ? "Error" : "Results"}
            </h3>
            {!error && results && Array.isArray(results) && (
              <span className="text-sm text-stone-500 dark:text-stone-400">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {!error && results && (
            <button
              onClick={handleCopyJson}
              className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md transition-colors cursor-pointer flex items-center gap-2 px-3"
              title="Copy results as JSON"
            >
              <span className="text-xs font-medium">
                {isResultsCopied ? "Copied!" : "Copy JSON"}
              </span>
              {isResultsCopied
                ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 text-green-600 dark:text-green-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                )
                : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5"
                    />
                  </svg>
                )}
            </button>
          )}
        </div>
        <div className="flex-grow bg-stone-950 overflow-hidden relative">
          {error
            ? (
              <div className="p-4 overflow-auto h-full">
                <pre className="text-sm text-red-400 whitespace-pre-wrap font-mono">
                {error}
                </pre>
              </div>
            )
            : (
              <div className="h-full overflow-auto bg-white dark:bg-stone-950">
                {loading
                  ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-stone-500">
                      <div className="w-8 h-8 mb-4">
                        <svg
                          className="animate-spin w-full h-full text-amber-600"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          >
                          </circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          >
                          </path>
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-stone-600 dark:text-stone-400 animate-pulse">
                        Searching...
                      </p>
                    </div>
                  )
                  : !results
                  ? (
                    <div className="h-full flex items-center justify-center text-stone-500 text-sm">
                      Enter a query to search the world
                    </div>
                  )
                  : results.length === 0
                  ? (
                    <div className="p-8 text-center text-stone-500 italic">
                      No results found matching your query.
                    </div>
                  )
                  : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-stone-100 dark:bg-stone-800 sticky top-0 z-10">
                        <tr>
                          {Object.keys(
                            (() => {
                              const first = results[0] || {};
                              const { value, ...rest } =
                                first as unknown as Record<
                                  string,
                                  unknown
                                >;
                              return typeof value === "object" && value !== null
                                ? { ...rest, ...value }
                                : first;
                            })(),
                          )
                            .filter((key) => key !== "accountId")
                            .map((key) => (
                              <th
                                key={key}
                                className="px-4 py-2 border-b border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold whitespace-nowrap"
                              >
                                {key}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                        {results.map((item, index) => {
                          const { value, ...rest } = item as unknown as Record<
                            string,
                            unknown
                          >;
                          const flattenedItem =
                            typeof value === "object" && value !== null
                              ? { ...rest, ...value }
                              : item;

                          return (
                            <tr
                              key={index}
                              className="hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors"
                            >
                              {Object.keys(
                                (() => {
                                  const first = results[0] || {};
                                  const { value, ...rest } =
                                    first as unknown as Record<string, unknown>;
                                  return typeof value === "object" &&
                                      value !== null
                                    ? { ...rest, ...value }
                                    : first;
                                })(),
                              )
                                .filter((key) => key !== "accountId")
                                .map((key) => {
                                  const val = (
                                    flattenedItem as Record<string, unknown>
                                  )[key];
                                  return (
                                    <td
                                      key={key}
                                      className="px-4 py-2 text-stone-900 dark:text-stone-100 whitespace-nowrap max-w-xs truncate"
                                      title={typeof val === "object"
                                        ? JSON.stringify(val)
                                        : String(val)}
                                    >
                                      {typeof val === "object"
                                        ? JSON.stringify(val)
                                        : String(val)}
                                    </td>
                                  );
                                })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
