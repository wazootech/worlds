"use client";

import { useState } from "react";
import type { ServiceAccount } from "@wazoo/sdk";
import { ShieldCheck, Copy, Check } from "lucide-react";

export function ServiceAccountDetails({
  serviceAccount,
  organizationId,
}: {
  serviceAccount: ServiceAccount;
  organizationId: string;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [isOrgCopied, setIsOrgCopied] = useState(false);
  const [isKeyCopied, setIsKeyCopied] = useState(false);

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start gap-5">
        {/* Icon */}
        <div className="flex-shrink-0 h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center border-2 border-white dark:border-stone-800 shadow-sm">
          <ShieldCheck className="w-10 h-10 text-stone-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white truncate">
                {serviceAccount.label || serviceAccount.id}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <button
                  onClick={() =>
                    copyToClipboard(serviceAccount.id, setIsCopied)
                  }
                  className="inline-flex items-center gap-2 px-1.5 py-0.5 -ml-1.5 rounded-md text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 transition-colors cursor-pointer group select-none"
                  title="Click to copy ID"
                >
                  <span className="font-mono text-xs opacity-70">ID:</span>
                  <span className="font-mono text-xs">{serviceAccount.id}</span>
                  {isCopied ? (
                    <Check className="w-3 h-3 text-green-600 dark:text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <span className="text-stone-300 dark:text-stone-700">•</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-stone-50 dark:bg-stone-900/50 rounded-lg p-4 border border-stone-200 dark:border-stone-800">
            <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
              Description
            </h3>
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
              {serviceAccount.description || (
                <span className="italic text-stone-400 text-xs">
                  No description provided for this service account.
                </span>
              )}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-500 mb-1">
                Created
              </span>
              <span className="text-sm font-medium text-stone-900 dark:text-stone-200">
                {new Date(serviceAccount.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-500 mb-1">
                Last Updated
              </span>
              <span className="text-sm font-medium text-stone-900 dark:text-stone-200">
                {new Date(serviceAccount.updatedAt).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-500 mb-1">
                Organization ID
              </span>
              <button
                onClick={() => copyToClipboard(organizationId, setIsOrgCopied)}
                className="inline-flex items-center gap-2 px-1.5 py-0.5 -ml-1.5 rounded-md text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 transition-colors cursor-pointer group select-none w-fit"
                title="Click to copy Organization ID"
              >
                <span className="text-sm font-mono">{organizationId}</span>
                {isOrgCopied ? (
                  <Check className="w-3 h-3 text-green-600 dark:text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
            <div className="flex flex-col col-span-full sm:col-span-2 lg:col-span-3">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-500 mb-1">
                API Key
              </span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded text-stone-700 dark:text-stone-300 break-all">
                  {(serviceAccount as ServiceAccount & { apiKey?: string })
                    .apiKey || "••••••••••••••••"}
                </code>
                <button
                  onClick={() =>
                    copyToClipboard(
                      (serviceAccount as ServiceAccount & { apiKey?: string })
                        .apiKey || "",
                      setIsKeyCopied,
                    )
                  }
                  className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  title="Copy API Key"
                >
                  {isKeyCopied ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
