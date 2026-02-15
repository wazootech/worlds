"use client";

import { useState } from "react";
import type { ExecuteSparqlOutput } from "@wazoo/sdk";
import { useQueryState } from "nuqs";
import { SparqlEditor } from "@/components/sparql-editor";
import { SparqlResultsDisplay } from "@/components/sparql-results-display";
import { SparqlResultCopyButton } from "@/components/sparql-result-copy-button";
import { SuggestedQueries } from "@/components/suggested-queries";
import { executeSparqlQuery } from "@/app/actions";
import { AlertCircle } from "lucide-react";

export function WorldSparqlPlayground({ worldId }: { worldId: string }) {
  const [sparqlQuery, setSparqlQuery] = useQueryState("q", {
    defaultValue:
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nSELECT * WHERE {\n  ?s ?p ?o\n} LIMIT 10",
  });

  const [results, setResults] = useState<
    ExecuteSparqlOutput | { message: string } | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecuteSparql = async () => {
    if (!sparqlQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await executeSparqlQuery(worldId, sparqlQuery);
      if (response.success) {
        setResults(response.results || null);
      } else {
        setError(response.error || "Failed to execute query");
      }
    } catch {
      setError("An unexpected error occurred while executing the query.");
    } finally {
      setIsLoading(false);
    }
  };

  const [showSuggestions, setShowSuggestions] = useState(true);

  return (
    <div className="flex flex-col gap-6 h-full min-h-[500px]">
      {showSuggestions && (
        <div className="shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
          <SuggestedQueries
            onSelect={(q) => {
              setSparqlQuery(q);
            }}
            onDismiss={() => setShowSuggestions(false)}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-0">
        <div className="lg:col-span-12 flex flex-col gap-6">
          <div className="space-y-6">
            <SparqlEditor
              value={sparqlQuery}
              onChange={setSparqlQuery}
              onExecute={handleExecuteSparql}
              isLoading={isLoading}
            />

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 flex gap-3 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-red-900 dark:text-red-200 uppercase tracking-wider">
                    Query Error
                  </h4>
                  <p className="text-xs text-red-800/80 dark:text-red-300/80 leading-relaxed font-mono">
                    {error}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden bg-white dark:bg-stone-950 shadow-sm flex-1 min-h-[400px]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
              <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Results
              </h3>
              {results && (
                <SparqlResultCopyButton
                  results={results}
                  showLabel
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                />
              )}
            </div>
            <div className="flex-1 overflow-auto">
              <SparqlResultsDisplay results={results} loading={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
