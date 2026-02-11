"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { ExecuteSparqlOutput } from "@wazoo/sdk";
import { formatSparqlResultsForCopy } from "@/lib/sparql-utils";

interface SparqlResultCopyButtonProps {
  results: ExecuteSparqlOutput | { message: string } | null;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

/**
 * Reusable copy button for SPARQL results.
 * Formats results appropriately (CSV for SELECT, JSON for others) before copying.
 */
export function SparqlResultCopyButton({
  results,
  variant = "ghost",
  size = "icon",
  className,
  showLabel = false,
}: SparqlResultCopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      return;
    }

    try {
      const text = formatSparqlResultsForCopy(results);
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;
  const iconColor = isCopied ? "text-green-600 dark:text-green-500" : undefined;

  if (showLabel) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleCopy}
      >
        <Icon className={`w-4 h-4 ${iconColor || ""}`} />
        <span className="text-xs font-medium ml-2">
          {isCopied ? "Copied!" : "Copy"}
        </span>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleCopy}
      title="Copy results"
    >
      <Icon className={`w-4 h-4 ${iconColor || ""}`} />
    </Button>
  );
}
