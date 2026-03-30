"use client";

import React from "react";
import { ExternalLinkIcon } from "lucide-react";

interface ComingSoonPlaceholderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  docsUrl: string;
}

export function ComingSoonPlaceholder({
  title,
  description,
  icon,
  docsUrl,
}: ComingSoonPlaceholderProps) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 p-12 text-center bg-white dark:bg-stone-900 shadow-sm animate-in fade-in duration-300">
      <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-stone-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
        {description}
      </p>
      <div className="mt-6 flex items-center justify-center">
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors cursor-pointer shadow-sm"
        >
          View Documentation
          <ExternalLinkIcon className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
