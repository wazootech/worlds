"use client";

import CodeEditor from "@uiw/react-textarea-code-editor";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SparqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  isLoading?: boolean;
}

export function SparqlEditor({
  value,
  onChange,
  onExecute,
  isLoading,
}: SparqlEditorProps) {
  return (
    <div className="relative border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden bg-stone-50 dark:bg-stone-900 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
        <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          SPARQL Query
        </h3>
        <Button
          size="sm"
          onClick={onExecute}
          disabled={isLoading || !value.trim()}
          className="h-8 gap-2 bg-amber-600 hover:bg-amber-700 text-white border-none"
        >
          {isLoading ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Execute
        </Button>
      </div>
      <div className="min-h-[200px] max-h-[400px] overflow-auto">
        <CodeEditor
          value={value}
          language="sparql"
          placeholder="PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nSELECT * WHERE {\n  ?s ?p ?o\n} LIMIT 10"
          onChange={(evn) => onChange(evn.target.value)}
          disabled={isLoading}
          padding={15}
          style={{
            fontSize: 14,
            backgroundColor: "transparent",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
          className="dark:text-stone-100"
        />
      </div>
    </div>
  );
}
