"use client";

import { useState, useEffect } from "react";
import { createHighlighter, Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: ["json"],
    });
  }
  return highlighterPromise;
}

export function JSONCodeBlock({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function highlight() {
      try {
        const highlighter = await getHighlighter();
        const highlightedHtml = highlighter.codeToHtml(code, {
          lang: "json",
          theme: "github-dark",
        });
        if (isMounted) {
          setHtml(highlightedHtml);
        }
      } catch (error) {
        console.error("Failed to highlight code:", error);
        if (isMounted) {
          setHtml(`<pre><code>${code}</code></pre>`);
        }
      }
    }

    highlight();
    return () => {
      isMounted = false;
    };
  }, [code]);

  if (!html) {
    return (
      <pre
        className={`bg-stone-950/50 p-3 rounded-md border border-stone-800 font-mono text-[11px] text-stone-400 overflow-x-auto ${className}`}
      >
        <code>{code}</code>
      </pre>
    );
  }

  // Shiki's output includes its own
  // <pre> and <code> tags with inline styles.
  // We wrap it to ensure container constraints like max-height and custom borders are applied.
  return (
    <div
      className={`rounded-md border border-stone-800 overflow-x-auto max-h-[350px] bg-[#24292e] [&>pre]:!bg-transparent [&>pre]:!p-3 [&>pre]:!m-0 [&>pre]:text-[11px] [&>pre]:leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
