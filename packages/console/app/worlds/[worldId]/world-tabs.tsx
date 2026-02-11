"use client";

import type { World } from "@wazoo/sdk";
import { useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { WorldDetails } from "./world-details";
import { WorldPlayground } from "./world-playground";
import { WorldSearch } from "./world-search";
import { WorldSettings } from "./world-settings";

const tabs = ["overview", "playground", "search", "settings"] as const;

interface WorldTabsProps {
  world: World;
  userId: string;

  codeSnippet: string;
  maskedCodeSnippet: string;
  codeSnippetHtml: string;
  maskedCodeSnippetHtml: string;
  isAdmin?: boolean;
}

export function WorldTabs({
  world,
  userId,
  codeSnippet,
  maskedCodeSnippet,
  codeSnippetHtml,
  maskedCodeSnippetHtml,
  isAdmin,
}: WorldTabsProps) {
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(tabs).withDefault("overview"),
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="md:border-b border-stone-200 dark:border-stone-800">
        {/* Desktop Tabs */}
        <nav className="-mb-px hidden md:flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600"
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab("playground")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === "playground"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600"
            }`}
          >
            Playground
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === "search"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600"
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === "settings"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600"
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Mobile Dropdown */}
        <div className="md:hidden pb-4">
          <MobileTabSelect
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab)}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <WorldDetails
            world={world}
            userId={userId}

            codeSnippet={codeSnippet}
            maskedCodeSnippet={maskedCodeSnippet}
            codeSnippetHtml={codeSnippetHtml}
            maskedCodeSnippetHtml={maskedCodeSnippetHtml}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === "playground" && (
          <WorldPlayground worldId={world.id} userId={userId} />
        )}
        {activeTab === "search" && (
          <WorldSearch worldId={world.id} userId={userId} />
        )}
        {activeTab === "settings" && <WorldSettings world={world} />}
      </div>
    </div>
  );
}

function MobileTabSelect({
  activeTab,
  onChange,
}: {
  activeTab: (typeof tabs)[number];
  onChange: (tab: (typeof tabs)[number]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-white hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
      >
        <span className="capitalize font-medium block">{activeTab}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-5 h-5 text-stone-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          <div className="p-1 space-y-0.5">
            {tabs.map((tab) => (
              <label
                key={tab}
                className={`flex items-center w-full p-2.5 rounded-md cursor-pointer transition-colors ${
                  activeTab === tab
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                <input
                  type="radio"
                  name="mobile-tabs"
                  value={tab}
                  checked={activeTab === tab}
                  onChange={() => {
                    onChange(tab);
                    setIsOpen(false);
                  }}
                  className="sr-only"
                />
                <span className="capitalize text-sm font-medium flex-1">
                  {tab}
                </span>
                {activeTab === tab && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4 text-amber-600 dark:text-amber-400"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop to close when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0 bg-transparent"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
