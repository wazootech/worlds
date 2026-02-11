"use client";

import { useState } from "react";
import { parseAsBoolean, useQueryState } from "nuqs";
import type { WorldRecord } from "@fartlabs/worlds";
import { ConnectSdkButton } from "@/components/connect-sdk";
import { PixelPlanet } from "@/components/pixel-planet/pixel-planet";
import { PlanetDialog } from "@/components/pixel-planet/planet-dialog";
import { getSeedFromId } from "@/components/pixel-planet/lib/seed-utils";
import { ComingSoonPlaceholder } from "@/components/coming-soon-placeholder";

export function WorldDetails({
  world,
  userId, // eslint-disable-line @typescript-eslint/no-unused-vars
  apiKey,
  codeSnippet,
  maskedCodeSnippet,
  codeSnippetHtml,
  maskedCodeSnippetHtml,
}: {
  world: WorldRecord;
  userId: string;
  apiKey: string;
  codeSnippet: string;
  maskedCodeSnippet: string;
  codeSnippetHtml: string;
  maskedCodeSnippetHtml: string;
  isAdmin?: boolean;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [isAccountCopied, setIsAccountCopied] = useState(false);
  const [showPlanetDialog, setShowPlanetDialog] = useQueryState(
    "lounge",
    parseAsBoolean.withDefault(false),
  );

  const seed = getSeedFromId(world.id);

  return (
    <div className="space-y-6">
      <PlanetDialog
        isOpen={showPlanetDialog}
        onClose={() => setShowPlanetDialog(null)}
        type="earth"
        seed={seed}
      />
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start gap-5">
        {/* Planet Icon */}
        <button
          onClick={() => setShowPlanetDialog(true)}
          className="flex-shrink-0 h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-full bg-black/5 dark:bg-black/40 flex items-center justify-center relative hover:scale-105 transition-transform cursor-pointer border-2 border-white dark:border-stone-800 shadow-sm"
          title="View Planet"
        >
          <PixelPlanet type="earth" seed={seed} />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1 flex-1">
              {/* Title Row */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 group">
                  <h1
                    className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white transition-all truncate"
                    title={world.label}
                  >
                    {world.label}
                  </h1>
                </div>
              </div>

              {/* ID & Status */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div
                  onClick={() => {
                    navigator.clipboard.writeText(world.id);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-2 px-1.5 py-0.5 -ml-1.5 rounded-md text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 transition-colors cursor-pointer group select-none"
                  title="Click to copy ID"
                >
                  <span className="font-mono text-xs opacity-70">ID:</span>
                  <span className="font-mono text-xs">{world.id}</span>
                  {isCopied
                    ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-3 H-3 text-green-600 dark:text-green-500"
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
                        className="w-3 h-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5"
                        />
                      </svg>
                    )}
                </div>
                <span className="text-stone-300 dark:text-stone-700">•</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75">
                    </span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500">
                    </span>
                  </span>
                  Active
                </span>
              </div>
            </div>

            <ConnectSdkButton
              apiKey={apiKey}
              codeSnippet={codeSnippet}
              maskedCodeSnippet={maskedCodeSnippet}
              codeSnippetHtml={codeSnippetHtml}
              maskedCodeSnippetHtml={maskedCodeSnippetHtml}
            />
          </div>

          {/* Description */}
          <div className="group -ml-2 p-2 rounded-md transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Description
              </h3>
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed max-w-3xl">
              {world.description || (
                <span className="italic text-stone-400">
                  No description provided.
                </span>
              )}
            </p>
          </div>

          {/* Compact Stats */}
          <div className="flex flex-wrap gap-x-8 gap-y-2 py-4 border-y border-stone-200 dark:border-stone-800/50">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-500">
                Created
              </span>
              <span className="text-sm font-medium text-stone-900 dark:text-stone-200">
                {new Date(world.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-500">
                Last Updated
              </span>
              <span className="text-sm font-medium text-stone-900 dark:text-stone-200">
                {new Date(world.updatedAt).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-500">
                Account ID
              </span>
              <div
                onClick={() => {
                  navigator.clipboard.writeText(world.accountId);
                  setIsAccountCopied(true);
                  setTimeout(() => setIsAccountCopied(false), 2000);
                }}
                className="inline-flex items-center gap-2 px-1.5 py-0.5 -ml-1.5 rounded-md text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 transition-colors cursor-pointer group select-none w-fit"
                title="Click to copy Account ID"
              >
                <span className="text-sm font-mono text-stone-600 dark:text-stone-400">
                  {world.accountId}
                </span>
                {isAccountCopied
                  ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-3 H-3 text-green-600 dark:text-green-500"
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
                      className="w-3 h-3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5"
                      />
                    </svg>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex flex-col">
          <ComingSoonPlaceholder
            title="Conversation"
            description="Learn how to chat with your world using natural language by following the documentation."
            docsUrl="https://docs.wazoo.tech/conversation"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-amber-600 dark:text-amber-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}
