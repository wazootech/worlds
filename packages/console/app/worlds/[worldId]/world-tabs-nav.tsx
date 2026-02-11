"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const tabs = [
  { id: "overview", label: "Overview", path: "" },
  { id: "playground", label: "Playground", path: "/playground" },
  { id: "search", label: "Search", path: "/search" },
  { id: "settings", label: "Settings", path: "/settings" },
] as const;

interface WorldTabsNavProps {
  worldId: string;
}

export function WorldTabsNav({ worldId }: WorldTabsNavProps) {
  const pathname = usePathname();

  // Determine active tab based on pathname
  const getActiveTab = () => {
    const worldPath = `/worlds/${worldId}`;

    // Check if we are exactly on the world overview page
    if (pathname === worldPath) return "overview";

    // Find the tab that matches the start of the current pathname
    for (const tab of tabs) {
      if (tab.path === "") continue;
      const tabFullChildPath = `${worldPath}${tab.path}`;
      if (
        pathname === tabFullChildPath ||
        pathname.startsWith(`${tabFullChildPath}/`)
      ) {
        return tab.id;
      }
    }

    return "overview";
  };

  const activeTab = getActiveTab();

  return (
    <div className="md:border-b border-stone-200 dark:border-stone-800">
      {/* Desktop Tabs */}
      <nav className="-mb-px hidden md:flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const href = `/worlds/${worldId}${tab.path}`;
          const isActive = activeTab === tab.id;

          return (
            <Link
              key={tab.id}
              href={href}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                isActive
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Dropdown */}
      <div className="md:hidden pb-4">
        <MobileTabSelect worldId={worldId} activeTab={activeTab} />
      </div>
    </div>
  );
}

function MobileTabSelect({
  worldId,
  activeTab,
}: {
  worldId: string;
  activeTab: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label ||
    "Overview";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-white hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
      >
        <span className="capitalize font-medium block">{activeTabLabel}</span>
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
            {tabs.map((tab) => {
              const href = `/worlds/${worldId}${tab.path}`;
              const isActive = activeTab === tab.id;

              return (
                <Link
                  key={tab.id}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center w-full p-2.5 rounded-md cursor-pointer transition-colors ${
                    isActive
                      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
                >
                  <span className="capitalize text-sm font-medium flex-1">
                    {tab.label}
                  </span>
                  {isActive && (
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
                </Link>
              );
            })}
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
