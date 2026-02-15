"use client";

import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { useState } from "react";
import type { ExecuteSparqlOutput } from "@wazoo/sdk";
import { SparqlResultsDisplay } from "@/components/sparql-results-display";
import { SparqlResultCopyButton } from "@/components/sparql-result-copy-button";
import { searchTriples } from "@/app/actions";
import { AlertCircle, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function WorldTripleSearch({ worldId }: { worldId: string }) {
  const [query, setQuery] = useQueryState(
    "query",
    parseAsString.withDefault(""),
  );
  const [limit, setLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(100),
  );
  const [subject, setSubject] = useQueryState(
    "subject",
    parseAsString.withDefault(""),
  );
  const [predicate, setPredicate] = useQueryState(
    "predicate",
    parseAsString.withDefault(""),
  );

  const [results, setResults] = useState<
    ExecuteSparqlOutput | { message: string } | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecuteSearch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await searchTriples(worldId, query, {
        limit,
        subjects: subject ? [subject] : undefined,
        predicates: predicate ? [predicate] : undefined,
      });
      if (response.success) {
        setResults({
          head: {
            vars: ["score", "subject", "predicate", "object"],
            link: null,
          },
          results: {
            bindings: (response.results || []).map(
              (r: {
                subject: string;
                predicate: string;
                object: string;
                score: number;
              }) => ({
                score: {
                  type: "literal",
                  value: r.score.toFixed(3),
                },
                subject: { type: "uri", value: r.subject },
                predicate: { type: "uri", value: r.predicate },
                object: {
                  type: r.object.startsWith("http") ? "uri" : "literal",
                  value: r.object,
                },
              }),
            ),
          },
        });
      } else {
        setError(response.error || "Failed to search");
      }
    } catch {
      setError("An unexpected error occurred while searching.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-[600px]">
      <div className="border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-stone-950 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-900 pb-4">
          <Filter className="w-4 h-4 text-stone-400" />
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
            Search Filters
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label htmlFor="search-query">Query</Label>
            <Input
              id="search-query"
              placeholder="e.g. hello"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-limit">Limit</Label>
            <Input
              id="search-limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-subject">Subject URI</Label>
            <Input
              id="search-subject"
              placeholder="e.g. http://example.org/user/1"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-predicate">Predicate URI</Label>
            <Input
              id="search-predicate"
              placeholder="e.g. rdf:type"
              value={predicate}
              onChange={(e) => setPredicate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-stone-100 dark:border-stone-900">
          <Button
            onClick={handleExecuteSearch}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? "Searching..." : "Search Triples"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 flex gap-3 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-red-900 dark:text-red-200 uppercase tracking-wider">
              Search Error
            </h4>
            <p className="text-xs text-red-800/80 dark:text-red-300/80 leading-relaxed">
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden bg-white dark:bg-stone-950 shadow-sm flex-1 min-h-[300px]">
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
          )}{" "}
        </div>
        <div className="flex-1 overflow-auto">
          <SparqlResultsDisplay results={results} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}
